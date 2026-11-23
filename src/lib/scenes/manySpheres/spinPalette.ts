import * as THREE from 'three'

/**
 * Sphere colors for "color by spin", by the spin's tilt from the quantization
 * axis (sRGB hex). Up is the axis positive m circulates about, world +Y (see
 * planning/hydrogen-orbitals.md, "Axis handedness").
 */
export const SPIN_PALETTE = {
  up: '#f1921f',
  sideways: '#9b59b6',
  down: '#2f6fd0',
} as const

/** The palette as the shaders' mat3 uniform: columns up, sideways, down, linear. */
export function spinPaletteMatrix(): THREE.Matrix3 {
  const linear = (hex: string) => new THREE.Color(hex)
  const up = linear(SPIN_PALETTE.up)
  const sideways = linear(SPIN_PALETTE.sideways)
  const down = linear(SPIN_PALETTE.down)
  // Matrix3.set takes rows; each color is a column
  return new THREE.Matrix3().set(
    up.r,
    sideways.r,
    down.r,
    up.g,
    sideways.g,
    down.g,
    up.b,
    sideways.b,
    down.b,
  )
}
