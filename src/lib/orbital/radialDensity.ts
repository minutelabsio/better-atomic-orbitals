import { generalizedLaguerre } from './laguerre.js'

/**
 * Radial probability density of the hydrogen orbital (n, l): the probability per
 * unit r, |R_nl(r)|² · r² (the r² is the radial volume element). Returned as a
 * closure of r. Shape only — normalization constants are dropped (irrelevant for
 * sampling). In atomic units (a0 = 1):
 *
 *   |R_nl|² ∝ r^(2l) e^(-2r/n) [L_{n-l-1}^{2l+1}(2r/n)]²
 *   density(r) = |R_nl|² · r² ∝ r^(2l+2) e^(-2r/n) [L_{n-l-1}^{2l+1}(2r/n)]²
 */
export function radialDensity(n: number, l: number): (r: number) => number {
  const k = n - l - 1
  const alpha = 2 * l + 1
  return (r: number): number => {
    const lag = generalizedLaguerre(k, alpha, (2 * r) / n)
    return r ** (2 * l + 2) * Math.exp((-2 * r) / n) * lag * lag
  }
}
