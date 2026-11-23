import { associatedLegendre } from './legendre.js'

/**
 * The real, polar part Θ of the normalized spherical harmonic
 * Y_l^m(θ, φ) = Θ_l^m(θ) e^(imφ), with the Condon–Shortley phase, for any
 * sign of m (Y_l^-m = (-1)^m conj(Y_l^m)). Zero for |m| > l.
 *
 * The phase matters once two harmonics are added, as in a fine-structure
 * spinor: it sets which way the spin tilts.
 */
export function sphericalHarmonicPolar(
  l: number,
  m: number,
): (polar: number) => number {
  const order = Math.abs(m)
  if (order > l) return () => 0
  const negativeMPhase = m < 0 && order % 2 === 1 ? -1 : 1
  const norm =
    negativeMPhase *
    Math.sqrt(((2 * l + 1) / (4 * Math.PI)) * factorialRatio(l, order))
  return (polar) => norm * associatedLegendre(l, order, Math.cos(polar))
}

/** (l - m)! / (l + m)!, for 0 ≤ m ≤ l. */
function factorialRatio(l: number, m: number): number {
  let ratio = 1
  for (let k = l - m + 1; k <= l + m; k += 1) {
    ratio /= k
  }
  return ratio
}
