<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'

const { scene, onFrame } = getContext<{
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  onFrame: (fn: () => void) => () => void
}>('three')

onMount(() => {
  const POINT_COUNT = 1000
  const SPHERE_RADIUS = 1
  const positions = new Float32Array(POINT_COUNT * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < POINT_COUNT; i++) {
    v.set(
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2),
    )
    if (v.lengthSq() === 0) v.set(1, 0, 0)
    v.normalize().multiplyScalar(SPHERE_RADIUS * Math.cbrt(Math.random()))
    positions[i * 3] = v.x
    positions[i * 3 + 1] = v.y
    positions[i * 3 + 2] = v.z
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0x66ccff,
    size: 0.04,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geometry, material)
  scene.add(points)

  const unsubscribe = onFrame(() => {
    points.rotation.y += 0.003
  })

  return () => {
    unsubscribe()
    scene.remove(points)
    geometry.dispose()
    material.dispose()
  }
})
</script>
