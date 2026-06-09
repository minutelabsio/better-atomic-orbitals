import { associatedLegendre } from './legendre.js'

/**
 * Polar-angle probability density of the hydrogen orbital (l, m): the φ-integrated
 * angular marginal |Y_lm(θ)|² · sinθ (sinθ is the solid-angle volume element).
 * Returned as a closure of θ ∈ [0, π]. Shape only — normalization is dropped, and
 * since |ψ|² ∝ |P_l^|m||², only the Legendre magnitude is needed (φ is uniform).
 */
export function angularDensity(
  l: number,
  m: number,
): (theta: number) => number {
  return (theta: number): number => {
    const p = associatedLegendre(l, m, Math.cos(theta))
    return p * p * Math.sin(theta)
  }
}
