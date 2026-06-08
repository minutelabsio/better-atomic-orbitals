<script lang="ts">
import { getContext, onMount } from 'svelte'
import * as THREE from 'three'

const { scene, onFrame } = getContext<{
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  onFrame: (fn: () => void) => () => void
}>('three')

// --- scene parameters ---
const COUNT = 20000
const CLUSTER_RADIUS = 1.5       // radius of the sphere volume they're distributed in
const SPHERE_RADIUS = 0.012     // radius of each individual sphere
const SPHERE_SEGMENTS = 7      // width segments (height = SPHERE_SEGMENTS - 2)
const COLOR = new THREE.Color().setHSL(30/360, 1, 0.2819)
const ROUGHNESS = .6
const METALNESS = 0

const ROTATION_SPEED = -0.001  // negative = clockwise from above; quadratic falloff below
const SPEED_EPSILON = 0.1      // softens the 1/r² singularity near the Y axis

const LIGHT_COLOR = new THREE.Color().setHSL(0, 0, 0.91)
const DIR_LIGHT_COLOR = LIGHT_COLOR
const DIR_LIGHT_INTENSITY = 3
const DIR_LIGHT_POS = new THREE.Vector3(5, 8, 5)
const SHADOW_MAP_SIZE = 2048
const SHADOW_FRUSTUM = 2       // half-extent of the directional light shadow frustum

const AMBIENT_COLOR = new THREE.Color().setHSL(0.611, 0.333, 0.3)
const AMBIENT_INTENSITY = 6
// ------------------------

onMount(() => {
  const dirLight = new THREE.DirectionalLight(DIR_LIGHT_COLOR, DIR_LIGHT_INTENSITY)
  dirLight.position.copy(DIR_LIGHT_POS)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE)
  dirLight.shadow.camera.near = 0.1
  dirLight.shadow.camera.far = 20
  dirLight.shadow.camera.left = -SHADOW_FRUSTUM
  dirLight.shadow.camera.right = SHADOW_FRUSTUM
  dirLight.shadow.camera.top = SHADOW_FRUSTUM
  dirLight.shadow.camera.bottom = -SHADOW_FRUSTUM
  scene.add(dirLight)

  const ambientLight = new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY)
  scene.add(ambientLight)

  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS - 2)
  const material = new THREE.MeshPhysicalMaterial({ color: COLOR, metalness: METALNESS, roughness: ROUGHNESS })

  const mesh = new THREE.InstancedMesh(geometry, material, COUNT)

  const theta = new Float32Array(COUNT)
  const radii = new Float32Array(COUNT)
  const yPos = new Float32Array(COUNT)
  const speed = new Float32Array(COUNT)

  const matrix = new THREE.Matrix4()
  const v = new THREE.Vector3()
  for (let i = 0; i < COUNT; i++) {
    v.set(
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2),
    )
    if (v.lengthSq() === 0) v.set(1, 0, 0)
    v.normalize().multiplyScalar(CLUSTER_RADIUS * Math.cbrt(Math.random()))

    const r = Math.sqrt(v.x * v.x + v.z * v.z)
    radii[i] = r
    yPos[i] = v.y
    theta[i] = Math.atan2(v.z, v.x)
    speed[i] = ROTATION_SPEED / ((r + SPEED_EPSILON) ** 2)

    matrix.makeTranslation(v.x, v.y, v.z)
    mesh.setMatrixAt(i, matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)

  const unsubscribe = onFrame(() => {
    for (let i = 0; i < COUNT; i++) {
      theta[i] += speed[i]
      const r = radii[i]
      matrix.makeTranslation(r * Math.cos(theta[i]), yPos[i], r * Math.sin(theta[i]))
      mesh.setMatrixAt(i, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return () => {
    unsubscribe()
    scene.remove(mesh, dirLight, ambientLight)
    geometry.dispose()
    material.dispose()
  }
})
</script>
