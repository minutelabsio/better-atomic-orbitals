import { angularDensity } from './angularDensity.js'
import { makeInverseCdfSampler } from './inverseCdfSampler.js'
import type { ParticleUniforms } from './particleUniforms.js'
import { radialDensity } from './radialDensity.js'

/**
 * Where every particle sits in one orbital, in spherical (r, polar), world
 * units. Azimuth is not part of the shape: |ψ|² is φ-independent for a complex
 * eigenstate, so φ belongs to the motion and is carried separately.
 *
 * A plain object (not a class) on purpose: intween's state handling deep-clones
 * plain objects and arrays but passes typed arrays through by reference, so
 * shapes travel through a tween cheaply and intact.
 */
export interface OrbitalShape {
  kind: 'orbital'
  n: number
  l: number
  m: number
  /** radius per particle, world units */
  r: Float32Array
  /** polar angle from the +Y spin axis per particle, [0, π] */
  polar: Float32Array
  /** ⟨r⟩ in world units */
  meanRadius: number
}

export interface OrbitalShapeOptions {
  /** the bulk of the cloud is scaled to roughly this world radius */
  clusterRadius?: number
  /** radial quantile mapped to clusterRadius */
  fitPercentile?: number
}

/**
 * Map fixed per-particle uniforms through orbital (n,l,m)'s radial and polar
 * inverse CDFs. Same uniforms + different orbital = the same particles in their
 * new places. The fit scale uses the exact radial quantile rather than an
 * empirical percentile, so it's deterministic.
 */
export function orbitalShape(
  n: number,
  l: number,
  m: number,
  uniforms: ParticleUniforms,
  { clusterRadius = 1.4, fitPercentile = 0.99 }: OrbitalShapeOptions = {},
): OrbitalShape {
  const meanRadiusAtomic = (3 * n * n - l * (l + 1)) / 2
  const rMaxAtomic = 4 * meanRadiusAtomic + 10
  const radialQuantile = makeInverseCdfSampler(
    radialDensity(n, l),
    0,
    rMaxAtomic,
    2048,
  )
  const polarQuantile = makeInverseCdfSampler(
    angularDensity(l, m),
    0,
    Math.PI,
    1024,
  )

  const scale = clusterRadius / (radialQuantile(fitPercentile) || 1)
  const count = uniforms.uR.length
  const r = new Float32Array(count)
  const polar = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // clamp the rare far-tail points so everything stays inside the grid bounds
    r[i] = Math.min(radialQuantile(uniforms.uR[i]!) * scale, clusterRadius)
    polar[i] = polarQuantile(uniforms.uPolar[i]!)
  }

  return {
    kind: 'orbital',
    n,
    l,
    m,
    r,
    polar,
    meanRadius: meanRadiusAtomic * scale,
  }
}
