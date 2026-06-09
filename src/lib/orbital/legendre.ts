/**
 * Associated Legendre function P_l^m(x), |x| <= 1, via the standard recurrence
 * (Numerical Recipes `plgndr`). Only the magnitude matters for sampling |Y_lm|²,
 * so the Condon-Shortley sign and normalization are irrelevant; m is taken as |m|.
 */
export function associatedLegendre(l: number, m: number, x: number): number {
  m = Math.abs(m)
  if (m > l) return 0

  // P_m^m = (-1)^m (2m-1)!! (1-x²)^(m/2)
  let pmm = 1
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, 1 - x * x))
    let fact = 1
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2
      fact += 2
    }
  }
  if (l === m) return pmm

  let pmmp1 = x * (2 * m + 1) * pmm // P_{m+1}^m
  if (l === m + 1) return pmmp1

  let pll = 0
  for (let ll = m + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmmp1 - (ll + m - 1) * pmm) / (ll - m)
    pmm = pmmp1
    pmmp1 = pll
  }
  return pll
}
