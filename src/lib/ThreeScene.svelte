<script lang="ts">
import { onMount } from 'svelte'
import * as THREE from 'three'

let canvas: HTMLCanvasElement

onMount(() => {
  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0f)

  // Camera
  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100,
  )
  camera.position.set(0, 0, 4)
  camera.lookAt(0, 0, 0)

  // Renderer — attach to our canvas element so it inherits CSS sizing
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

  // Spherical point cloud: 1000 points distributed uniformly within a
  // unit-radius ball. Direction comes from a normalized Gaussian vector;
  // radius uses cbrt() so density is even by volume (not clumped at center).
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
    // Reject the degenerate zero vector before normalizing
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

  // Resize handling via ResizeObserver on the canvas element
  const resizeObserver = new ResizeObserver(() => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  })
  resizeObserver.observe(canvas)

  // Animation loop
  let rafId: number
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    points.rotation.y += 0.003
    renderer.render(scene, camera)
  }
  animate()

  return () => {
    cancelAnimationFrame(rafId)
    resizeObserver.disconnect()
    renderer.dispose()
    geometry.dispose()
    material.dispose()
  }
})
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
