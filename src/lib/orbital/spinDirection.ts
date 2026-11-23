import type { FineStructureNumbers } from './fineStructure.js'
import { spinorPolarAmplitudes } from './spinorAngular.js'

/**
 * The local spin direction s = ψ†σψ / ψ†ψ, as components in the meridional
 * plane of the right-handed frame (ê_ρ, ê_φ, ê_axis) where positive m
 * circulates with increasing φ. It has no ê_φ component.
 */
export interface MeridionalSpin {
  /** along ê_ρ, away from the axis */
  readonly rho: number
  /** along the quantization axis: cos of the spin's tilt from it */
  readonly axial: number
}

/**
 * The spin direction of a fine-structure state, as a function of θ alone.
 *
 * With ψ↑ = R a e^(i m φ) and ψ↓ = R b e^(i (m+1) φ) (a, b real):
 *   ψ†σ_z ψ = R² (a² - b²),  ψ†(σ_x + iσ_y)ψ = 2 ψ↑* ψ↓ = 2 R² a b e^(iφ)
 * so the sideways part points along ê_ρ = (cos φ, sin φ, 0), and R cancels.
 * The vector turns with the particle as it orbits, keeping its tilt.
 *
 * It's a unit vector wherever ψ ≠ 0; at a node of both components (only ever
 * on the axis) it's undefined and this returns zero.
 */
export function spinDirection(
  state: Pick<FineStructureNumbers, 'l' | 'j' | 'mj'>,
): (polar: number) => MeridionalSpin {
  const amplitudesAt = spinorPolarAmplitudes(state)
  return (polar) => {
    const { up, down } = amplitudesAt(polar)
    const density = up * up + down * down
    if (density === 0) return { rho: 0, axial: 0 }
    return {
      rho: (2 * up * down) / density,
      axial: (up * up - down * down) / density,
    }
  }
}
