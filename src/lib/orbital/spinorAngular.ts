import { spinorComponents } from './clebschGordan.js'
import type { FineStructureNumbers } from './fineStructure.js'
import { sphericalHarmonicPolar } from './sphericalHarmonic.js'

/**
 * The real polar amplitudes of a fine-structure spinor at one polar angle:
 * ψ↑ = R(r) · up · e^(i m↑ φ) and ψ↓ = R(r) · down · e^(i m↓ φ).
 */
export interface SpinorPolarAmplitudes {
  readonly up: number
  readonly down: number
}

/** (CG amplitude · Θ_l^m(θ)) for each spin component, as a function of θ. */
export function spinorPolarAmplitudes(
  state: Pick<FineStructureNumbers, 'l' | 'j' | 'mj'>,
): (polar: number) => SpinorPolarAmplitudes {
  const { up, down } = spinorComponents(state)
  const upPolar = sphericalHarmonicPolar(state.l, up.m)
  const downPolar = sphericalHarmonicPolar(state.l, down.m)
  return (polar) => ({
    up: up.amplitude * upPolar(polar),
    down: down.amplitude * downPolar(polar),
  })
}
