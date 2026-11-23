import type { CylindricalGradient } from './logAmplitudeGradient.js'

export type Vec3 = readonly [number, number, number]

/** Spin projection on the quantization axis, in units of ħ/2. */
export const SPIN_UP = 1
export const SPIN_DOWN = -1

/**
 * The spin term of the Pauli probability current (Holland; Colijn & Vrscay,
 * Phys. Lett. A 300 (2002) 334), as a velocity, in atomic units (ħ = mₑ = 1):
 *
 *   v_spin = ∇ln|ψ| × s      (= ½ ∇ln|ψ|² × s)
 *
 * `s` is the local spin polarization ψ†σψ / ψ†ψ, a unit vector for a pure
 * spin state. Both vectors must be in the same right-handed frame. This is
 * the whole spin term only while `s` is the same everywhere; a spin direction
 * that varies in space adds ½ ∇×s.
 *
 * The term is a curl, (1/2|ψ|²) ∇×(|ψ|² s), so it is divergence-free and
 * leaves |ψ|² stationary: the cloud keeps its shape while it flows.
 */
export function spinCurrentVelocity(gradLnAmplitude: Vec3, spin: Vec3): Vec3 {
  const [gx, gy, gz] = gradLnAmplitude
  const [sx, sy, sz] = spin
  return [gy * sz - gz * sy, gz * sx - gx * sz, gx * sy - gy * sx]
}

/**
 * Angular velocity about the quantization axis from the spin term, when the
 * spin lies along that axis: `spinProjection` +1 is spin up, -1 spin down
 * (fractions scale it, for a smooth switch).
 *
 * Spin along the axis keeps the flow a pure rotation about it:
 *
 *   ω_spin = -spinProjection · ∂ρ ln|ψ| / ρ
 *
 * evaluated in the local right-handed frame (ê_ρ, ê_φ, ê_axis), where φ
 * increases the way positive m circulates. On the axis itself (ρ = 0) the
 * point doesn't move whatever ω is, so this returns 0 there.
 */
export function axialSpinCurrentOmega(
  gradLnAmplitude: CylindricalGradient,
  rho: number,
  spinProjection: number,
): number {
  if (rho === 0) return 0
  const [, alongPhi] = spinCurrentVelocity(
    [gradLnAmplitude.rho, 0, gradLnAmplitude.height],
    [0, 0, spinProjection],
  )
  return alongPhi / rho
}
