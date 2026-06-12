<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'
import fragmentShader from './orbitalGlass.frag.glsl'
import vertexShader from './orbitalGlass.vert.glsl'
// Park2 cubemap (Emil Persson / Humus, CC-BY 3.0) — a standard three.js skybox.
import negx from '../../../assets/skybox/park2/negx.jpg?url'
import negy from '../../../assets/skybox/park2/negy.jpg?url'
import negz from '../../../assets/skybox/park2/negz.jpg?url'
import posx from '../../../assets/skybox/park2/posx.jpg?url'
import posy from '../../../assets/skybox/park2/posy.jpg?url'
import posz from '../../../assets/skybox/park2/posz.jpg?url'

const { scene, camera, onFrame } = getContext<{
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  onFrame: (fn: () => void) => () => void
}>('three')

let {
  n = 2,
  l = 1,
  m = 0,
  steps = 256,
  iso = 0.01,
  ior = 1.5,
  glassTint = '#bfe9ff',
  absorb = 1.2,
  densityGraded = false,
  cutaway = false,
}: {
  n?: number
  l?: number
  m?: number
  steps?: number
  iso?: number
  ior?: number
  glassTint?: string
  absorb?: number
  densityGraded?: boolean
  cutaway?: boolean
} = $props()

const tintCol = new THREE.Color()

onMount(() => {
  // CubeTextureLoader order is [+X, -X, +Y, -Y, +Z, -Z].
  const envMap = new THREE.CubeTextureLoader().load([
    posx,
    negx,
    posy,
    negy,
    posz,
    negz,
  ])
  envMap.colorSpace = THREE.SRGBColorSpace

  // PlaneGeometry(2,2) corners are already in clip space — fullscreen quad.
  const geometry = new THREE.PlaneGeometry(2, 2)
  const uniforms = {
    uCameraPos: { value: new THREE.Vector3() },
    uInvViewProj: { value: new THREE.Matrix4() },
    uN: { value: n },
    uL: { value: l },
    uM: { value: m },
    uSteps: { value: steps },
    uIso: { value: iso },
    uIOR: { value: ior },
    uGlassTint: { value: new THREE.Vector3() },
    uAbsorb: { value: absorb },
    uDensityGraded: { value: densityGraded },
    uCutaway: { value: cutaway },
    uEnvMap: { value: envMap },
  }
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)

  const invViewProj = new THREE.Matrix4()

  const unsubscribe = onFrame(() => {
    camera.updateMatrixWorld()
    uniforms.uCameraPos.value.copy(camera.position)
    invViewProj
      .copy(camera.projectionMatrixInverse)
      .premultiply(camera.matrixWorld)
    uniforms.uInvViewProj.value.copy(invViewProj)

    uniforms.uN.value = n
    uniforms.uL.value = l
    uniforms.uM.value = m
    uniforms.uSteps.value = steps
    uniforms.uIso.value = iso
    uniforms.uIOR.value = ior
    uniforms.uAbsorb.value = absorb
    uniforms.uDensityGraded.value = densityGraded
    uniforms.uCutaway.value = cutaway
    tintCol.set(glassTint)
    uniforms.uGlassTint.value.set(tintCol.r, tintCol.g, tintCol.b)
  })

  return () => {
    unsubscribe()
    scene.remove(mesh)
    geometry.dispose()
    material.dispose()
    envMap.dispose()
  }
})
</script>
