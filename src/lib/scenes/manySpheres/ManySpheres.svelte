<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'
import fragmentShader from './manySpheres.frag.glsl'
import vertexShader from './manySpheres.vert.glsl'
import displayShader from './manySpheresDisplay.frag.glsl'
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
  blend = 0.5,
  randomize = false,
  indirect = true,
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
  randomize?: boolean
  indirect?: boolean
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

function makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

onMount(() => {
  const grid = new SphereGrid({ count, gridRes })

  const uniforms = {
    uCameraPos: { value: new THREE.Vector3() },
    uInvViewProj: { value: new THREE.Matrix4() },
    uSpherePos: { value: grid.spherePosTex },
    uCellRange: { value: grid.cellRangeTex },
    uIndexList: { value: grid.indexListTex },
    uSpherePosTexW: { value: grid.spherePosTexW },
    uCellRangeTexW: { value: grid.cellRangeTexW },
    uIndexListTexW: { value: grid.indexListTexW },
    uGridRes: { value: grid.gridRes },
    uBoundMin: { value: grid.boundMin },
    uCellSize: { value: grid.cellSize },
    uAlbedo: { value: new THREE.Vector3() },
    uBackground: { value: new THREE.Vector3() },
    uHistory: { value: null as THREE.Texture | null },
    uBlend: { value: 1 },
    uFrame: { value: 0 },
    uRandomize: { value: true },
    uIndirectEnabled: { value: true },
  }
  const traceMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
  })

  // offscreen quad: runs the ray-trace + accumulation pass into a render target
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), traceMaterial)
  quad.frustumCulled = false
  const traceScene = new THREE.Scene().add(quad)
  const traceCamera = new THREE.Camera()

  // visible mesh in the main scene: just displays the latest accumulation texture
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

  let read = makeTarget(1, 1)
  let write = makeTarget(1, 1)
  let tw = 0
  let th = 0

  const invViewProj = new THREE.Matrix4()
  const drawBuf = new THREE.Vector2()
  const prevPos = new THREE.Vector3()
  const prevQuat = new THREE.Quaternion()
  let frame = 0

  const unsubscribe = onFrame(() => {
    const renderer = ctx.renderer
    if (!renderer) return

    grid.update(cutaway, sphereRadius, radiusVariation, cutawayFeather)

    // size the accumulation targets to the (scaled) drawing buffer
    renderer.getDrawingBufferSize(drawBuf)
    const w = Math.max(1, Math.floor(drawBuf.x * resScale))
    const h = Math.max(1, Math.floor(drawBuf.y * resScale))
    let reset = frame === 0
    if (w !== tw || h !== th) {
      read.setSize(w, h)
      write.setSize(w, h)
      tw = w
      th = h
      reset = true
    }

    // camera-move detection -> snap accumulation to the current sample
    camera.updateMatrixWorld()
    // if (
    //   !reset &&
    //   (camera.position.distanceToSquared(prevPos) > 1e-9 ||
    //     Math.abs(camera.quaternion.dot(prevQuat)) < 0.9999995)
    // ) {
    //   reset = true
    // }
    prevPos.copy(camera.position)
    prevQuat.copy(camera.quaternion)

    uniforms.uCameraPos.value.copy(camera.position)
    invViewProj
      .copy(camera.projectionMatrixInverse)
      .premultiply(camera.matrixWorld)
    uniforms.uInvViewProj.value.copy(invViewProj)
    uniforms.uHistory.value = read.texture
    uniforms.uBlend.value = reset ? 1 : blend
    uniforms.uFrame.value = frame
    uniforms.uRandomize.value = randomize
    uniforms.uIndirectEnabled.value = indirect
    albedoColor.set(sphereColor)
    uniforms.uAlbedo.value.set(albedoColor.r, albedoColor.g, albedoColor.b)
    bgColor3.set(bgColor)
    uniforms.uBackground.value.set(bgColor3.r, bgColor3.g, bgColor3.b)

    renderer.setRenderTarget(write)
    renderer.render(traceScene, traceCamera)
    renderer.setRenderTarget(null)

    const tmp = read
    read = write
    write = tmp
    displayUniforms.uTex.value = read.texture

    frame++
  })

  return () => {
    unsubscribe()
    scene.remove(displayMesh)
    quad.geometry.dispose()
    displayMesh.geometry.dispose()
    traceMaterial.dispose()
    displayMaterial.dispose()
    read.dispose()
    write.dispose()
    grid.dispose()
  }
})
</script>
