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
    uInvViewProj: { value: new THREE.Matrix4() },
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

  const invViewProj = new THREE.Matrix4()

  const unsubscribe = onFrame(() => {
    // Force matrix to be current — renderer.render() hasn't run yet this frame
    camera.updateMatrixWorld()
    uniforms.uCameraPos.value.copy(camera.position)
    // invViewProj = cameraMatrixWorld * projectionMatrixInverse
    invViewProj.copy(camera.projectionMatrixInverse).premultiply(camera.matrixWorld)
    uniforms.uInvViewProj.value.copy(invViewProj)
  })

  return () => {
    unsubscribe()
    scene.remove(mesh)
    geometry.dispose()
    material.dispose()
  }
})
</script>
