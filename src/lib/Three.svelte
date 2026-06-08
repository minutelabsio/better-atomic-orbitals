<script lang="ts">
import { setContext, onMount, type Snippet } from 'svelte'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let { children }: { children: Snippet } = $props()

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0f)

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
camera.position.set(0, 0, 4)
camera.lookAt(0, 0, 0)

const frameCallbacks = new Set<() => void>()

setContext('three', {
  scene,
  camera,
  onFrame: (fn: () => void) => {
    frameCallbacks.add(fn)
    return () => frameCallbacks.delete(fn)
  },
})

let canvas: HTMLCanvasElement

onMount(() => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true

  const resizeObserver = new ResizeObserver(() => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  })
  resizeObserver.observe(canvas)

  let rafId: number
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    controls.update()
    for (const fn of frameCallbacks) fn()
    renderer.render(scene, camera)
  }
  animate()

  return () => {
    cancelAnimationFrame(rafId)
    resizeObserver.disconnect()
    controls.dispose()
    renderer.dispose()
  }
})
</script>

<canvas bind:this={canvas}></canvas>
{@render children()}

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
