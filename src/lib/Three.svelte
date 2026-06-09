<script lang="ts">
import {
  EffectComposer,
  EffectPass,
  LUT3DEffect,
  RenderPass,
} from 'postprocessing'
import { onMount, type Snippet, setContext } from 'svelte'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { LUTCubeLoader } from 'three/examples/jsm/loaders/LUTCubeLoader.js'

let { children, lutPath }: { children: Snippet; lutPath: string } = $props()

const scene = new THREE.Scene()
scene.background = new THREE.Color().setHSL(0, 0, 0.91)

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
camera.position.set(0, 0, 4)
camera.lookAt(0, 0, 0)

const frameCallbacks = new Set<() => void>()

// renderer is created in onMount (after child scenes mount); scenes that need it
// for offscreen passes read ctx.renderer lazily inside their frame callback.
const ctx: {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer | null
  onFrame: (fn: () => void) => () => void
} = {
  scene,
  camera,
  renderer: null,
  onFrame: (fn: () => void) => {
    frameCallbacks.add(fn)
    return () => frameCallbacks.delete(fn)
  },
}
setContext('three', ctx)

let canvas: HTMLCanvasElement

onMount(() => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  ctx.renderer = renderer
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.localClippingEnabled = true
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  })
  composer.addPass(new RenderPass(scene, camera))

  const loader = new LUTCubeLoader()
  let lutEffect: LUT3DEffect | undefined

  // Reactively load/swap the LUT whenever lutPath changes
  const stopEffects = $effect.root(() => {
    $effect(() => {
      const path = new URL(lutPath, import.meta.url).href
      loader
        .loadAsync(path)
        .then((result: { texture3D: THREE.Data3DTexture }) => {
          if (lutEffect) {
            lutEffect.lut = result.texture3D
          } else {
            lutEffect = new LUT3DEffect(result.texture3D, {
              tetrahedralInterpolation: true,
            })
            composer.addPass(new EffectPass(camera, lutEffect))
          }
        })
    })
  })

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true

  const stats = new Stats()
  document.body.appendChild(stats.dom)

  function resizeIfNeeded(): boolean {
    const dpr = window.devicePixelRatio
    const w = Math.floor(canvas.clientWidth * dpr)
    const h = Math.floor(canvas.clientHeight * dpr)
    if (canvas.width === w && canvas.height === h) return false
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
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
    composer.render()
    stats.end()
  }
  animate()

  return () => {
    stopEffects()
    cancelAnimationFrame(rafId)
    controls.dispose()
    composer.dispose()
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
