import type { FineStructureNumbers } from './fineStructure.js'
import { spinorPolarAmplitudes } from './spinorAngular.js'

/**
 * Polar-angle probability density of a fine-structure state, the analogue of
 * `angularDensity` for a spinor: (|Θ↑|² + |Θ↓|²) · sin θ.
 *
 * |ψ|² = R² (|Θ↑|² + |Θ↓|²) still separates into radial × polar and doesn't
 * depend on φ (the two components' e^(imφ) phases drop out of their own
 * squares), so the usual inverse-CDF sampling applies with this density and
 * the unchanged radial one. Every j = ½ state is spherically symmetric.
 */
export function fineStructureAngularDensity(
  state: Pick<FineStructureNumbers, 'l' | 'j' | 'mj'>,
): (polar: number) => number {
  const amplitudesAt = spinorPolarAmplitudes(state)
  return (polar) => {
    const { up, down } = amplitudesAt(polar)
    return (up * up + down * down) * Math.sin(polar)
  }
}
