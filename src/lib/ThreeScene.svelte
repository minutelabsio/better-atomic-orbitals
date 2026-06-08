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
  camera.position.set(2, 1.5, 3)
  camera.lookAt(0, 0, 0)

  // Renderer — attach to our canvas element so it inherits CSS sizing
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

  // Cube
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    roughness: 0.4,
    metalness: 0.1,
  })
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube)

  // Directional light (sun-like, from above-right)
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5)
  dirLight.position.set(5, 8, 4)
  scene.add(dirLight)

  // Soft ambient fill so shadows aren't pitch black
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambientLight)

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
    cube.rotation.x += 0.005
    cube.rotation.y += 0.008
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
