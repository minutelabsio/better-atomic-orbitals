import { angularDensity } from './angularDensity.js'
import { makeInverseCdfSampler } from './inverseCdfSampler.js'
import type { ParticleUniforms } from './particleUniforms.js'
import type { QuantumNumbers } from './quantumNumbers.js'
import { radialDensity } from './radialDensity.js'

const RADIAL_TABLE_SIZE = 2048
const POLAR_TABLE_SIZE = 1024

/**
 * Per-particle spherical position, world units: radius and polar angle from +Y.
 * Read-only views; the arrays may be shared (cached shapes) or reused buffers.
 */
export interface SphericalShape {
  readonly r: ArrayLike<number>
  readonly polar: ArrayLike<number>
}

/**
 * Where every particle sits in one orbital. Azimuth is not part of the shape:
 * |ψ|² is φ-independent for a complex eigenstate, so φ belongs to the motion.
 *
 * A plain object (not a class) on purpose: intween's state handling deep-clones
 * plain objects and arrays but passes typed arrays through by reference, so
 * shapes travel through a tween cheaply and intact.
 */
export interface OrbitalShape extends SphericalShape {
  readonly kind: 'orbital'
  readonly orbital: QuantumNumbers
  /** ⟨r⟩ in world units */
  readonly meanRadius: number
}

export interface OrbitalShapeOptions {
  /** the bulk of the cloud is scaled to roughly this world radius */
  clusterRadius?: number
  /** radial quantile mapped to clusterRadius */
  fitPercentile?: number
}

/**
 * Map fixed per-particle uniforms through the orbital's radial and polar
 * inverse CDFs: same uniforms + different orbital = the same particles in
 * their new places. Fitting to the exact radial quantile (not an empirical
 * percentile) keeps the result deterministic.
 */
export function orbitalShape(
  orbital: QuantumNumbers,
  uniforms: ParticleUniforms,
  { clusterRadius = 1.4, fitPercentile = 0.99 }: OrbitalShapeOptions = {},
): OrbitalShape {
  const { n, l, m } = orbital
  const meanRadiusAtomic = (3 * n * n - l * (l + 1)) / 2
  const radialQuantile = makeInverseCdfSampler(
    radialDensity(n, l),
    0,
    4 * meanRadiusAtomic + 10,
    RADIAL_TABLE_SIZE,
  )
  const polarQuantile = makeInverseCdfSampler(
    angularDensity(l, m),
    0,
    Math.PI,
    POLAR_TABLE_SIZE,
  )
  const scale = clusterRadius / (radialQuantile(fitPercentile) || 1)
  // clamp the rare far-tail points so everything stays inside the grid bounds
  const toWorldRadius = (u: number) =>
    Math.min(radialQuantile(u) * scale, clusterRadius)

  return {
    kind: 'orbital',
    orbital,
    r: Float32Array.from(uniforms.uR, toWorldRadius),
    polar: Float32Array.from(uniforms.uPolar, polarQuantile),
    meanRadius: meanRadiusAtomic * scale,
  }
}
