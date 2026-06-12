<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'
import fragmentShader from './orbitalScatter.frag.glsl'
import vertexShader from './orbitalScatter.vert.glsl'

const { scene, camera, onFrame } = getContext<{
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  onFrame: (fn: () => void) => () => void
}>('three')

let {
  n = 2,
  l = 1,
  m = 0,
  gain = 3.0,
  steps = 192,
  orbitalColor = '#e9ecff',
  bgColor = '#86b0e6',
  cutaway = false,
  // Single-scattering lighting. The light sits high in the sky and slightly to the
  // front-right; quantisation/spin axis is +Y, so "up" is the natural sky direction.
  lightDir = [0.5, 1.0, 0.4] as [number, number, number],
  lightColor = '#fff4e0',
  lightIntensity = 1.8,
  anisotropy = 0.6,
  ambient = 0.25,
}: {
  n?: number
  l?: number
  m?: number
  gain?: number
  steps?: number
  orbitalColor?: string
  bgColor?: string
  cutaway?: boolean
  lightDir?: [number, number, number]
  lightColor?: string
  lightIntensity?: number
  anisotropy?: number
  ambient?: number
} = $props()

// reusable scratch colors; hex strings (sRGB) -> linear working values
const orbitalCol = new THREE.Color()
const bgCol = new THREE.Color()
const lightCol = new THREE.Color()

onMount(() => {
  // PlaneGeometry(2,2) corners are already in clip space — fullscreen quad
  const geometry = new THREE.PlaneGeometry(2, 2)
  const uniforms = {
    uCameraPos: { value: new THREE.Vector3() },
    uInvViewProj: { value: new THREE.Matrix4() },
    uN: { value: n },
    uL: { value: l },
    uM: { value: m },
    uGain: { value: gain },
    uSteps: { value: steps },
    uOrbitalColor: { value: new THREE.Vector3() },
    uBgColor: { value: new THREE.Vector3() },
    uCutaway: { value: cutaway },
    uLightDir: { value: new THREE.Vector3() },
    uLightColor: { value: new THREE.Vector3() },
    uAnisotropy: { value: anisotropy },
    uAmbient: { value: ambient },
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
    uniforms.uGain.value = gain
    uniforms.uSteps.value = steps
    uniforms.uCutaway.value = cutaway
    orbitalCol.set(orbitalColor)
    uniforms.uOrbitalColor.value.set(orbitalCol.r, orbitalCol.g, orbitalCol.b)
    bgCol.set(bgColor)
    uniforms.uBgColor.value.set(bgCol.r, bgCol.g, bgCol.b)

    uniforms.uAnisotropy.value = anisotropy
    uniforms.uAmbient.value = ambient
    uniforms.uLightDir.value.set(lightDir[0], lightDir[1], lightDir[2]).normalize()
    lightCol.set(lightColor)
    uniforms.uLightColor.value
      .set(lightCol.r, lightCol.g, lightCol.b)
      .multiplyScalar(lightIntensity)
  })

  return () => {
    unsubscribe()
    scene.remove(mesh)
    geometry.dispose()
    material.dispose()
  }
})
</script>
