import * as THREE from 'three'

const FORMAT_BY_CHANNELS = {
  1: THREE.RedFormat,
  4: THREE.RGBAFormat,
} as const

/** A float DataTexture holding `texelCount` texels, plus direct access to its data. */
export interface PackedFloatTexture {
  readonly texture: THREE.DataTexture
  readonly data: Float32Array
  readonly width: number
  readonly height: number
}

/**
 * Pack `texelCount` texels into the squarest 2D float texture that holds
 * them. Nearest filtering: shaders fetch texels by index, never interpolate.
 */
export function packedFloatTexture(
  texelCount: number,
  channels: 1 | 4,
): PackedFloatTexture {
  const width = Math.ceil(Math.sqrt(texelCount))
  const height = Math.ceil(texelCount / width)
  const data = new Float32Array(width * height * channels)
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    FORMAT_BY_CHANNELS[channels],
    THREE.FloatType,
  )
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return { texture, data, width, height }
}
