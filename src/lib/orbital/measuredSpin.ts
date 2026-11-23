import { spinorComponents } from './clebschGordan.js'
import type { FineStructureNumbers } from './fineStructure.js'
import type { OrbitalShape } from './orbitalShape.js'
import { spinorPolarAmplitudes } from './spinorAngular.js'

/**
 * P(spin up | position) for a fine-structure state, as a function of θ alone:
 * |ψ↑|² / (|ψ↑|² + |ψ↓|²), the R² cancelling. Position and S_z commute, so
 * this is a genuine conditional probability from the joint Born distribution.
 *
 * Where both components vanish (only ever on the axis) it falls back to the
 * overall up probability |c↑|², which keeps a stretched state's 0 or 1 exact.
 */
export function spinUpProbability(
  state: Pick<FineStructureNumbers, 'l' | 'j' | 'mj'>,
): (polar: number) => number {
  const amplitudesAt = spinorPolarAmplitudes(state)
  const overallUp = spinorComponents(state).up.amplitude ** 2
  return (polar) => {
    const { up, down } = amplitudesAt(polar)
    const density = up * up + down * down
    return density === 0 ? overallUp : (up * up) / density
  }
}

/**
 * Each particle's measured spin along the axis, +1 (up) or -1 (down): up when
 * its fixed uniform `uSpin` falls below P(up | its position).
 *
 * Positions are already samples of |ψ↑|² + |ψ↓|², so labelling them this way
 * gives the same joint distribution as sampling (position, spin) together:
 * the up particles are distributed as |ψ↑|² and the down ones as |ψ↓|². The
 * probability depends on θ only and particles orbit at fixed θ, so a label
 * holds for life. These label possible measurement outcomes of the one
 * electron, not separate particles.
 */
export function measuredSpin(
  { orbital, polar }: OrbitalShape<FineStructureNumbers>,
  uSpin: ArrayLike<number>,
): Float32Array {
  const upProbabilityAt = spinUpProbability(orbital)
  return Float32Array.from({ length: polar.length }, (_, i) =>
    uSpin[i]! < upProbabilityAt(polar[i]!) ? 1 : -1,
  )
}
