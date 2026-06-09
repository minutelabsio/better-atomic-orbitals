<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'
import { lightingPresets } from '../lightingPresets.js'

const { scene, onFrame } = getContext<{
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  onFrame: (fn: () => void) => () => void
}>('three')

// --- scene parameters ---
const COUNT = 50000
const CLUSTER_RADIUS = 1.4 // radius of the sphere volume they're distributed in
const SPHERE_RADIUS = 0.018 // radius of each individual sphere
const SPHERE_SEGMENTS = 7 // width segments (height = SPHERE_SEGMENTS - 2)
const COLOR = new THREE.Color().setHSL(28 / 360, 1, 0.4819)
const ROUGHNESS = 0.5
const METALNESS = 0.5

const ROTATION_SPEED = -0.001 // negative = clockwise from above; quadratic falloff below
const SPEED_EPSILON = 0.1 // softens the 1/r² singularity near the Y axis
const XZ_GAP = 0.08 // minimum |y| distance from xz plane — no spheres in this band

// Clip z < 0 — reveals the interior cross-section as spheres orbit the Y axis
const CLIP_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)

// ------------------------

let { presetIdx = 0 }: { presetIdx?: number } = $props()

onMount(() => {
  const stopLighting = $effect.root(() => {
    $effect(() => {
      const group = lightingPresets[presetIdx]!.build()
      scene.add(group)
      return () => {
        scene.remove(group)
        group.traverse((obj) => {
          if (obj instanceof THREE.DirectionalLight) obj.shadow.map?.dispose()
        })
      }
    })
  })

  const geometry = new THREE.SphereGeometry(
    SPHERE_RADIUS,
    SPHERE_SEGMENTS,
    SPHERE_SEGMENTS - 2,
  )
  const material = new THREE.MeshPhysicalMaterial({
    color: COLOR,
    metalness: METALNESS,
    roughness: ROUGHNESS,
    clippingPlanes: [CLIP_PLANE],
    clipShadows: true,
  })

  const mesh = new THREE.InstancedMesh(geometry, material, COUNT)

  const theta = new Float32Array(COUNT)
  const radii = new Float32Array(COUNT)
  const yPos = new Float32Array(COUNT)
  const speed = new Float32Array(COUNT)

  const matrix = new THREE.Matrix4()
  const v = new THREE.Vector3()
  for (let i = 0; i < COUNT; i++) {
    do {
      v.set(
        THREE.MathUtils.randFloatSpread(2),
        THREE.MathUtils.randFloatSpread(2),
        THREE.MathUtils.randFloatSpread(2),
      )
      if (v.lengthSq() === 0) v.set(1, 0, 0)
      v.normalize().multiplyScalar(CLUSTER_RADIUS * Math.cbrt(Math.random()))
    } while (Math.abs(v.y) < XZ_GAP)

    const r = Math.sqrt(v.x * v.x + v.z * v.z)
    radii[i] = r
    yPos[i] = v.y
    theta[i] = Math.atan2(v.z, v.x)
    speed[i] = ROTATION_SPEED / (r + SPEED_EPSILON) ** 2

    matrix.makeTranslation(v.x, v.y, v.z)
    mesh.setMatrixAt(i, matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)

  const unsubscribe = onFrame(() => {
    for (let i = 0; i < COUNT; i++) {
      theta[i] = theta[i]! + speed[i]!
      const r = radii[i]!
      matrix.makeTranslation(
        r * Math.cos(theta[i]!),
        yPos[i]!,
        r * Math.sin(theta[i]!),
      )
      mesh.setMatrixAt(i, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return () => {
    stopLighting()
    unsubscribe()
    scene.remove(mesh)
    geometry.dispose()
    material.dispose()
  }
})
</script>
