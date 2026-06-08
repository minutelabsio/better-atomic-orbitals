<script lang="ts">
import { setContext, onMount, type Snippet } from 'svelte'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'

let { children }: { children: Snippet } = $props()

const scene = new THREE.Scene()
scene.background = new THREE.Color().setHSL(0, 0, 0.91)

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
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true

  const stats = new Stats()
  document.body.appendChild(stats.dom)

  // Per the three.js manual, avoid setPixelRatio() and instead manually
  // account for devicePixelRatio in the resize check. This keeps the actual
  // drawingBuffer size predictable (no magic scaling behind the scenes) and
  // also catches DPR changes (e.g. moving the window between monitors) since
  // the check runs every frame.
  function resizeIfNeeded(): boolean {
    const dpr = window.devicePixelRatio
    const w = Math.floor(canvas.clientWidth * dpr)
    const h = Math.floor(canvas.clientHeight * dpr)
    if (canvas.width === w && canvas.height === h) return false
    renderer.setSize(w, h, false)
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    return true
  }

  let rafId: number
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    stats.begin()
    resizeIfNeeded()
    controls.update()
    for (const fn of frameCallbacks) fn()
    renderer.render(scene, camera)
    stats.end()
  }
  animate()

  return () => {
    cancelAnimationFrame(rafId)
    controls.dispose()
    renderer.dispose()
    stats.dom.remove()
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
