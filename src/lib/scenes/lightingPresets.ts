import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

RectAreaLightUniformsLib.init()

const SHADOW_MAP_SIZE = 2048
const SHADOW_FRUSTUM = 2

function dirLight(
  hsl: [number, number, number],
  intensity: number,
  position: [number, number, number],
  castShadow = true,
): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(
    new THREE.Color().setHSL(...hsl),
    intensity,
  )
  light.position.set(...position)
  if (castShadow) {
    light.castShadow = true
    light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE)
    light.shadow.camera.near = 0.1
    light.shadow.camera.far = 20
    light.shadow.camera.left = -SHADOW_FRUSTUM
    light.shadow.camera.right = SHADOW_FRUSTUM
    light.shadow.camera.top = SHADOW_FRUSTUM
    light.shadow.camera.bottom = -SHADOW_FRUSTUM
  }
  return light
}

function hemiLight(
  skyHsl: [number, number, number],
  groundHsl: [number, number, number],
  intensity: number,
): THREE.HemisphereLight {
  return new THREE.HemisphereLight(
    new THREE.Color().setHSL(...skyHsl),
    new THREE.Color().setHSL(...groundHsl),
    intensity,
  )
}

function rectLight(
  hsl: [number, number, number],
  intensity: number,
  position: [number, number, number],
  width = 4,
  height = 4,
): THREE.RectAreaLight {
  const light = new THREE.RectAreaLight(
    new THREE.Color().setHSL(...hsl),
    intensity,
    width,
    height,
  )
  light.position.set(...position)
  light.lookAt(0, 0, 0)
  return light
}

function spotLight(
  hsl: [number, number, number],
  intensity: number,
  position: [number, number, number],
  angle = Math.PI / 6,
  penumbra = 0.3,
  castShadow = true,
): THREE.SpotLight {
  const light = new THREE.SpotLight(
    new THREE.Color().setHSL(...hsl),
    intensity,
    0,
    angle,
    penumbra,
    0, // decay=0 — no distance falloff, matches directional light behaviour
  )
  light.position.set(...position)
  if (castShadow) {
    light.castShadow = true
    light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE)
  }
  return light
}

export interface LightingPreset {
  name: string
  build: () => THREE.Group
}

export const lightingPresets: LightingPreset[] = [
  {
    name: 'Studio',
    build: () =>
      new THREE.Group().add(
        dirLight([0.611, 0.0, 0.9], 3.3, [5, 8, 5]),
        dirLight([0.611, 0.0, 0.85], 1.93, [-5, 3, 4]),
        dirLight([0.611, 0.0, 0.95], 1.1, [-1, -2, -6]),
        dirLight([0.611, 0.0, 0.98], 0.83, [4, 1, -5]),
      ),
  },
  {
    name: 'Dramatic',
    build: () =>
      new THREE.Group().add(
        dirLight([0.08, 0.0, 0.85], 4.5, [2, 12, 3]),
        dirLight([0.64, 0.0, 0.95], 1.2, [-4, -1, -7]),
      ),
  },
  {
    name: 'Natural',
    build: () =>
      new THREE.Group().add(
        dirLight([0.12, 0.0, 0.9], 2.8, [4, 6, 8]),
        dirLight([0.6, 0.0, 0.96], 1.5, [0, 10, 2]),
        dirLight([0.1, 0.0, 0.88], 0.8, [-6, 2, 5]),
      ),
  },
  {
    name: 'Overcast',
    build: () =>
      new THREE.Group().add(
        hemiLight([0.6, 0.0, 0.88], [0, 0, 0.12], 2.5),
        dirLight([0.1, 0.0, 0.95], 3.5, [2, 10, 3]),
      ),
  },
  {
    name: 'Softboxes',
    build: () =>
      new THREE.Group().add(
        rectLight([0.08, 0.0, 0.9], 2.5, [-4, 3, 3], 5, 5),
        rectLight([0.6, 0.0, 0.92], 1.5, [3, -1, 4], 3, 4),
        rectLight([0.6, 0.0, 0.96], 1.0, [0, 5, -1], 4, 4),
      ),
  },
  {
    name: 'Stage Spots',
    build: () => {
      const g = new THREE.Group()
      const s1 = spotLight([0.08, 0.0, 0.88], 8, [3, 8, 4], Math.PI / 8, 0.3)
      const s2 = spotLight([0.64, 0.0, 0.94], 5, [-4, 2, -8], Math.PI / 10, 0.2)
      const s3 = spotLight([0.1, 0.0, 0.92], 3, [0, 3, 7], Math.PI / 5, 0.5)
      g.add(s1, s1.target, s2, s2.target, s3, s3.target)
      return g
    },
  },
  {
    name: 'Neon Spots',
    build: () => {
      const g = new THREE.Group()
      const s1 = spotLight([0.85, 0.0, 0.82], 6, [4, 5, 3], Math.PI / 7, 0.4)
      const s2 = spotLight([0.5, 0.0, 0.88], 6, [-4, 3, -3], Math.PI / 7, 0.4)
      const s3 = spotLight([0.07, 0.0, 0.85], 4, [1, -3, 6], Math.PI / 9, 0.3)
      g.add(s1, s1.target, s2, s2.target, s3, s3.target)
      return g
    },
  },
]
