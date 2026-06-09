/**
 * Generalized Laguerre polynomial L_k^alpha(x), via the stable upward recurrence
 *   L_0 = 1,  L_1 = 1 + alpha - x,
 *   L_{i+1} = ((2i+1+alpha - x) L_i - (i+alpha) L_{i-1}) / (i+1).
 * Used for the hydrogen radial wavefunction (k = n-l-1, alpha = 2l+1, x = 2r/n).
 */
export function generalizedLaguerre(
  k: number,
  alpha: number,
  x: number,
): number {
  if (k === 0) return 1
  let prev = 1 // L_0
  let cur = 1 + alpha - x // L_1
  for (let i = 1; i < k; i++) {
    const next = ((2 * i + 1 + alpha - x) * cur - (i + alpha) * prev) / (i + 1)
    prev = cur
    cur = next
  }
  return cur
}
