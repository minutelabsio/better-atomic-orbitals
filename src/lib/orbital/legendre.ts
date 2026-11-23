/**
 * Associated Legendre function P_l^m(x), |x| <= 1, with the Condon-Shortley
 * phase (as Numerical Recipes `plgndr` and SciPy `lpmv`):
 *
 *   P_l^m(x) = (-1)^m (1 - x²)^(m/2) · d^m P_l/dx^m
 *
 * Only the magnitude matters for sampling |Y_lm|², so the phase and
 * normalization are irrelevant there; m is taken as |m|.
 */
export function associatedLegendre(l: number, m: number, x: number): number {
  const order = Math.abs(m)
  if (order > l) return 0
  const sinPower = Math.max(0, 1 - x * x) ** (order / 2)
  const phase = order % 2 === 0 ? 1 : -1
  return phase * sinPower * legendreDerivative(l, order, x)
}

/**
 * The m-th derivative of the Legendre polynomial, d^m P_l/dx^m: the polynomial
 * part of P_l^m once the (1 - x²)^(m/2) = sin^m θ factor is split off. Its own
 * derivative is the next one up, so d/dx of this is `legendreDerivative(l, m + 1, x)`.
 * Zero for m > l.
 *
 * Upward recurrence in l at fixed m (the `plgndr` recurrence with the sin^m
 * factor divided out):
 *   D_m^m = (2m-1)!!,  D_{m+1}^m = x (2m+1) D_m^m,
 *   D_l^m = (x (2l-1) D_{l-1}^m - (l+m-1) D_{l-2}^m) / (l-m).
 */
export function legendreDerivative(l: number, m: number, x: number): number {
  if (m > l) return 0

  let dmm = 1
  for (let odd = 1; odd < 2 * m; odd += 2) {
    dmm *= odd
  }
  if (l === m) return dmm

  let dmmp1 = x * (2 * m + 1) * dmm
  if (l === m + 1) return dmmp1

  let dll = 0
  for (let ll = m + 2; ll <= l; ll += 1) {
    dll = (x * (2 * ll - 1) * dmmp1 - (ll + m - 1) * dmm) / (ll - m)
    dmm = dmmp1
    dmmp1 = dll
  }
  return dll
}
