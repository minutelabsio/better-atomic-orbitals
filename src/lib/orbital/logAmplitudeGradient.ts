import {
  generalizedLaguerre,
  generalizedLaguerreDerivative,
} from './laguerre.js'
import { legendreDerivative } from './legendre.js'
import type { QuantumNumbers } from './quantumNumbers.js'

/**
 * A gradient in cylindrical components about the quantization axis. The φ
 * component of ∇ln|ψ| is always zero (|ψ| doesn't depend on φ), so it's left out.
 */
export interface CylindricalGradient {
  /** along ê_ρ, away from the axis */
  readonly rho: number
  /** along the axis */
  readonly height: number
}

export interface LogAmplitudeGradientOptions {
  /** the Bohr radius a₀ in the caller's length unit (1 = atomic units) */
  bohrRadius?: number
  /**
   * Added to (distance)² in every 1/distance singularity, in the caller's
   * length unit squared. 0 gives the exact gradient.
   */
  softening?: number
}

/**
 * ∇ln|ψ_nlm| at spherical (r, polar), as a function. Lengths are in units
 * where a₀ = `bohrRadius`, so a caller working in world units gets a gradient
 * in 1/world-length.
 *
 * ψ_nlm factors into pieces that each vanish on one kind of node:
 *
 *   |ψ| ∝ ρ^|m| · r^(l-|m|) · |D_l^|m|(cos θ)| · |L_{n-l-1}^{2l+1}(2r/n)| · e^(-r/n)
 *          axis    origin     nodal cones         nodal spheres            decay
 *
 * (r^l P_l^m(cos θ) = ρ^|m| r^(l-|m|) D_l^|m|(cos θ) up to sign, where D is
 * `legendreDerivative`). The log turns the product into a sum, so the gradient
 * is a sum of one term per factor. Every factor but the decay gives a
 * 1/(distance to its node) singularity. With `softening` ε each of those
 * becomes d/(d² + ε) — the same Plummer-style softening as ω = m/(ρ² + ε) —
 * so near a node the term stays bounded, and far from it the term is
 * unchanged. The decay term has no singularity and is never softened.
 */
export function logAmplitudeGradient(
  { n, l, m }: QuantumNumbers,
  { bohrRadius = 1, softening = 0 }: LogAmplitudeGradientOptions = {},
): (r: number, polar: number) => CylindricalGradient {
  const order = Math.abs(m)
  const laguerreDegree = n - l - 1
  const laguerreAlpha = 2 * l + 1
  const laguerreScale = 2 / (n * bohrRadius)
  const decayRate = 1 / (n * bohrRadius)
  const soft = (numerator: number, denominator: number) =>
    softenedRatio(numerator, denominator, softening)

  return (r, polar) => {
    const sinPolar = Math.sin(polar)
    const cosPolar = Math.cos(polar)
    const rho = r * sinPolar

    const axisTerm = order * soft(1, rho)
    const originTerm = (l - order) * soft(1, r)
    const x = laguerreScale * r
    const sphereNodeTerm = soft(
      laguerreScale *
        generalizedLaguerreDerivative(laguerreDegree, laguerreAlpha, x),
      generalizedLaguerre(laguerreDegree, laguerreAlpha, x),
    )
    // (1/r) ∂θ ln|D(cos θ)| = -sin θ D'(cos θ) / (r D(cos θ))
    const coneNodeTerm = soft(
      -sinPolar * legendreDerivative(l, order + 1, cosPolar),
      r * legendreDerivative(l, order, cosPolar),
    )

    const alongR = originTerm + sphereNodeTerm - decayRate
    const alongPolar = coneNodeTerm
    return {
      rho: axisTerm + sinPolar * alongR + cosPolar * alongPolar,
      height: cosPolar * alongR - sinPolar * alongPolar,
    }
  }
}

/**
 * numerator/denominator, read as 1/distance with distance = denominator/numerator,
 * softened to distance/(distance² + ε). Written without dividing by the
 * numerator so it stays finite when either side is zero (ε > 0).
 */
function softenedRatio(
  numerator: number,
  denominator: number,
  softening: number,
): number {
  if (numerator === 0) return 0
  return (
    (numerator * denominator) /
    (denominator * denominator + softening * numerator * numerator)
  )
}
