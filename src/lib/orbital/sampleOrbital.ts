import { angularDensity } from './angularDensity.js'
import { sphericalToCylindrical } from './coords.js'
import { makeInverseCdfSampler } from './inverseCdfSampler.js'
import { radialDensity } from './radialDensity.js'
import { probabilityCurrentOmega } from './velocity.js'

export interface OrbitalSample {
  /** cylindrical radius from the spin axis (Y), world units */
  rho: Float32Array
  /** position along the spin axis (Y), world units */
  y: Float32Array
  /** azimuth about the spin axis, [0, 2π) */
  phi: Float32Array
  /** per-particle probability-current angular velocity (before the visual speed scale) */
  omega: Float32Array
  /** ⟨r⟩ of the orbital in world units (for later size scaling) */
  meanRadius: number
}

export interface SampleOrbitalOptions {
  /** the sampled cloud's bulk is scaled to roughly this world radius */
  clusterRadius?: number
  /** softening for omega near the spin axis */
  omegaSoftening?: number
  /** sampled-radius percentile mapped to clusterRadius (fits the bulk in bounds) */
  fitPercentile?: number
}

function percentile(values: Float64Array, p: number): number {
  const sorted = Float64Array.from(values).sort()
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(p * sorted.length)),
  )
  return sorted[idx]!
}

/**
 * Draw `count` points from |ψ_nlm|² as three independent 1-D marginals — radial
 * and polar by inverse-CDF, azimuth uniform — in our axes (spin axis = Y). This
 * factorization is exact for a complex eigenstate (∝ e^{imφ}): |ψ|² is φ-independent,
 * so the shape lives in (r, θ) and the motion in φ. Returns the cylindrical motion
 * state SphereGrid stores; atomic-unit radii are rescaled so the bulk fits about
 * `clusterRadius`, and omega is computed from the world-space rho.
 */
export function sampleOrbital(
  n: number,
  l: number,
  m: number,
  count: number,
  {
    clusterRadius = 1.4,
    omegaSoftening = 0.02,
    fitPercentile = 0.99,
  }: SampleOrbitalOptions = {},
): OrbitalSample {
  const meanRadiusAtomic = (3 * n * n - l * (l + 1)) / 2
  const rMaxAtomic = 4 * meanRadiusAtomic + 10
  const sampleR = makeInverseCdfSampler(
    radialDensity(n, l),
    0,
    rMaxAtomic,
    2048,
  )
  const samplePolar = makeInverseCdfSampler(
    angularDensity(l, m),
    0,
    Math.PI,
    1024,
  )

  const rAtomic = new Float64Array(count)
  const polar = new Float64Array(count)
  const phi = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    rAtomic[i] = sampleR(Math.random())
    polar[i] = samplePolar(Math.random())
    phi[i] = Math.random() * 2 * Math.PI
  }

  const scale = clusterRadius / (percentile(rAtomic, fitPercentile) || 1)
  const rho = new Float32Array(count)
  const y = new Float32Array(count)
  const omega = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // clamp the rare far-tail points so everything stays inside the grid bounds
    const rWorld = Math.min(rAtomic[i]! * scale, clusterRadius)
    const c = sphericalToCylindrical(rWorld, polar[i]!)
    rho[i] = c.rho
    y[i] = c.y
    omega[i] = probabilityCurrentOmega(c.rho, m, omegaSoftening)
  }

  return { rho, y, phi, omega, meanRadius: meanRadiusAtomic * scale }
}
