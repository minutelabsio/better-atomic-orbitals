<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'
import vertexShader from './manySpheres.vert.glsl'
import displayShader from './manySpheresDisplay.frag.glsl'
import objGIShader from './manySpheresObjGI.frag.glsl'
import probeShader from './manySpheresProbe.frag.glsl'
import { SphereGrid } from './sphereGrid.js'

const ctx = getContext<{
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer | null
  onFrame: (fn: () => void) => () => void
}>('three')
const { scene, camera, onFrame } = ctx

let {
  count = 50000,
  gridRes = 48,
  resScale = 0.5,
  blend = 0.05,
  samples = 1,
  sphereColor = '#ec7813',
  bgColor = '#33373d',
  cutaway = false,
  cutawayFeather = 0,
  sphereRadius = 0.012,
  radiusVariation = 0,
}: {
  count?: number
  gridRes?: number
  resScale?: number
  blend?: number
  samples?: number
  sphereColor?: string
  bgColor?: string
  cutaway?: boolean
  cutawayFeather?: number
  sphereRadius?: number
  radiusVariation?: number
} = $props()

// reusable scratch colors; hex strings (sRGB) -> linear working values
const albedoColor = new THREE.Color()
const bgColor3 = new THREE.Color()

// screen-sized target for the (noise-free) primary pass
function makeScreenTarget(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

// per-sphere buffer: one texel per sphere, never interpolated
function makeSphereTarget(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

onMount(() => {
  const grid = new SphereGrid({ count, gridRes })
  const sphereTexW = grid.spherePosTexW
  const sphereTexH = (grid.spherePosTex.image as { height: number }).height

  // shared grid uniforms (texture references are stable; data is updated in place)
  const gridUniforms = {
    uSpherePos: { value: grid.spherePosTex },
    uCellRange: { value: grid.cellRangeTex },
    uIndexList: { value: grid.indexListTex },
    uSpherePosTexW: { value: grid.spherePosTexW },
    uSphereTexH: { value: sphereTexH },
    uCellRangeTexW: { value: grid.cellRangeTexW },
    uIndexListTexW: { value: grid.indexListTexW },
    uGridRes: { value: grid.gridRes },
    uBoundMin: { value: grid.boundMin },
    uCellSize: { value: grid.cellSize },
  }

  // --- probe pass: per-sphere indirect accumulation ---
  const probeUniforms = {
    ...gridUniforms,
    uCount: { value: count },
    uAlbedo: { value: new THREE.Vector3() },
    uBackground: { value: new THREE.Vector3() },
    uIndirectHistory: { value: null as THREE.Texture | null },
    uBlend: { value: 1 },
    uFrame: { value: 0 },
    uSamples: { value: samples },
  }
  const probeMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: probeShader,
    uniforms: probeUniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
  })

  // --- primary pass: direct shading + per-sphere indirect lookup ---
  const primaryUniforms = {
    uCameraPos: { value: new THREE.Vector3() },
    uInvViewProj: { value: new THREE.Matrix4() },
    ...gridUniforms,
    uAlbedo: { value: new THREE.Vector3() },
    uBackground: { value: new THREE.Vector3() },
    uIndirect: { value: null as THREE.Texture | null },
  }
  const primaryMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: objGIShader,
    uniforms: primaryUniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
  })

  const quadGeo = new THREE.PlaneGeometry(2, 2)
  const probeQuad = new THREE.Mesh(quadGeo, probeMaterial)
  probeQuad.frustumCulled = false
  const probeScene = new THREE.Scene().add(probeQuad)
  const primaryQuad = new THREE.Mesh(quadGeo, primaryMaterial)
  primaryQuad.frustumCulled = false
  const primaryScene = new THREE.Scene().add(primaryQuad)
  const offscreenCamera = new THREE.Camera()

  // visible mesh in the main scene: displays the latest primary-pass texture
  const displayUniforms = { uTex: { value: null as THREE.Texture | null } }
  const displayMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: displayShader,
    uniforms: displayUniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
  })
  const displayMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    displayMaterial,
  )
  displayMesh.frustumCulled = false
  scene.add(displayMesh)

  // per-sphere indirect ping-pong (fixed size = sphere-position texture)
  let indirectRead = makeSphereTarget(sphereTexW, sphereTexH)
  let indirectWrite = makeSphereTarget(sphereTexW, sphereTexH)

  let frameTarget = makeScreenTarget(1, 1)
  let tw = 0
  let th = 0

  const invViewProj = new THREE.Matrix4()
  const drawBuf = new THREE.Vector2()
  let frame = 0

  const unsubscribe = onFrame(() => {
    const renderer = ctx.renderer
    if (!renderer) return

    grid.update(cutaway, sphereRadius, radiusVariation, cutawayFeather)

    albedoColor.set(sphereColor)
    bgColor3.set(bgColor)
    probeUniforms.uAlbedo.value.set(albedoColor.r, albedoColor.g, albedoColor.b)
    probeUniforms.uBackground.value.set(bgColor3.r, bgColor3.g, bgColor3.b)
    primaryUniforms.uAlbedo.value.set(
      albedoColor.r,
      albedoColor.g,
      albedoColor.b,
    )
    primaryUniforms.uBackground.value.set(bgColor3.r, bgColor3.g, bgColor3.b)

    // 1. probe pass -> accumulate per-sphere indirect (EMA in sphere-index space)
    probeUniforms.uIndirectHistory.value = indirectRead.texture
    probeUniforms.uBlend.value = frame === 0 ? 1 : blend
    probeUniforms.uFrame.value = frame
    probeUniforms.uSamples.value = samples
    renderer.setRenderTarget(indirectWrite)
    renderer.render(probeScene, offscreenCamera)
    const tmpI = indirectRead
    indirectRead = indirectWrite
    indirectWrite = tmpI

    // 2. primary pass -> direct shading + indirect lookup, into a screen target
    renderer.getDrawingBufferSize(drawBuf)
    const w = Math.max(1, Math.floor(drawBuf.x * resScale))
    const h = Math.max(1, Math.floor(drawBuf.y * resScale))
    if (w !== tw || h !== th) {
      frameTarget.setSize(w, h)
      tw = w
      th = h
    }
    camera.updateMatrixWorld()
    primaryUniforms.uCameraPos.value.copy(camera.position)
    invViewProj
      .copy(camera.projectionMatrixInverse)
      .premultiply(camera.matrixWorld)
    primaryUniforms.uInvViewProj.value.copy(invViewProj)
    primaryUniforms.uIndirect.value = indirectRead.texture
    renderer.setRenderTarget(frameTarget)
    renderer.render(primaryScene, offscreenCamera)
    renderer.setRenderTarget(null)

    displayUniforms.uTex.value = frameTarget.texture
    frame++
  })

  return () => {
    unsubscribe()
    scene.remove(displayMesh)
    quadGeo.dispose()
    displayMesh.geometry.dispose()
    probeMaterial.dispose()
    primaryMaterial.dispose()
    displayMaterial.dispose()
    indirectRead.dispose()
    indirectWrite.dispose()
    frameTarget.dispose()
    grid.dispose()
  }
})
</script>
