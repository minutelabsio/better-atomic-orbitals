/**
 * Probability-current (Bohmian) angular velocity for a complex hydrogen
 * eigenstate ~ e^{i m phi}, which flows as a rigid rotation about its spin axis.
 *
 *   omega(rho) = m / (rho^2 + softening)
 *
 * `rho` is the cylindrical radius from the spin axis. In atomic units the current
 * velocity is m / rho^2; the `softening` term (added to rho^2) keeps omega finite
 * near the axis where it would otherwise diverge. That divergence is harmless for
 * a real orbital — |psi|^2 -> 0 on the axis whenever m != 0, so almost no points
 * sit there — but the softening makes it robust for arbitrary point sets too.
 *
 * A separate visual speed scale (the notebook's K) is applied at animation time,
 * not here, so this stays the pure physics.
 *
 * m = 0 returns 0: s-orbitals and all m = 0 states carry no current and are static.
 */
export function probabilityCurrentOmega(
  rho: number,
  m: number,
  softening = 0.02,
): number {
  if (m === 0) return 0
  return m / (rho * rho + softening)
}
