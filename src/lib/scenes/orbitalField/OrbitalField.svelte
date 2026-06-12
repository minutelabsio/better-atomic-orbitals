<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'
import fragmentShader from './orbitalField.frag.glsl'
import vertexShader from './orbitalField.vert.glsl'

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
  orbitalColor = '#1b1b2f',
  bgColor = '#ffffff',
  cutaway = false,
}: {
  n?: number
  l?: number
  m?: number
  gain?: number
  steps?: number
  orbitalColor?: string
  bgColor?: string
  cutaway?: boolean
} = $props()

// reusable scratch colors; hex strings (sRGB) -> linear working values
const orbitalCol = new THREE.Color()
const bgCol = new THREE.Color()

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
  })

  return () => {
    unsubscribe()
    scene.remove(mesh)
    geometry.dispose()
    material.dispose()
  }
})
</script>
