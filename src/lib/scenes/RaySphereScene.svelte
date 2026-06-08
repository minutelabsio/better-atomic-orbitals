<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'
import fragmentShader from './raySphere.frag.glsl'
import vertexShader from './raySphere.vert.glsl'

const { scene, camera, onFrame } = getContext<{
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  onFrame: (fn: () => void) => () => void
}>('three')

onMount(() => {
  // PlaneGeometry(2,2) has corners at (±1, ±1, 0) — clip space already
  const geometry = new THREE.PlaneGeometry(2, 2)
  const uniforms = {
    uCameraPos: { value: new THREE.Vector3() },
    uProjectionMatrixInverse: { value: new THREE.Matrix4() },
    uCameraMatrixWorld: { value: new THREE.Matrix4() },
  }
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)

  const unsubscribe = onFrame(() => {
    uniforms.uCameraPos.value.copy(camera.position)
    uniforms.uProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse)
    uniforms.uCameraMatrixWorld.value.copy(camera.matrixWorld)
  })

  return () => {
    unsubscribe()
    scene.remove(mesh)
    geometry.dispose()
    material.dispose()
  }
})
</script>
