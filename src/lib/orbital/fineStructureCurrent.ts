import { type SpinorComponent, spinorComponents } from './clebschGordan.js'
import type { FineStructureNumbers } from './fineStructure.js'
import {
  type CylindricalGradient,
  type LogAmplitudeGradientOptions,
  logAmplitudeGradient,
} from './logAmplitudeGradient.js'
import { axialSpinCurrentOmega, SPIN_DOWN, SPIN_UP } from './spinCurrent.js'
import { spinDirection } from './spinDirection.js'
import { probabilityCurrentOmega } from './velocity.js'

type GradientAt = (r: number, polar: number) => CylindricalGradient

/**
 * Angular velocity about the quantization axis of the full Pauli current of a
 * fine-structure state, in atomic units (ħ = mₑ = 1):
 *
 *   v = j / |ψ|²,   j = Im(ψ†∇ψ) + ½ ∇×(ψ†σψ)
 *
 * The spin direction varies in space here, so this is not the uniform-spin
 * `∇ln|ψ| × s` of `spinCurrent.ts`; the curl covers the ½∇×s part too. For
 * these states the current is purely azimuthal (Colijn & Vrscay,
 * arXiv quant-ph/0304198), so each particle still circles the axis.
 *
 * Writing each component as A↑,↓ e^(i m↑,↓ φ) with A real (each is an
 * ordinary orbital |n l m↑,↓⟩ times a Clebsch–Gordan weight), weights
 * w = A²/|ψ|², spin s = (2A↑A↓ ê_ρ + (A↑² - A↓²) ê_axis)/|ψ|², and
 * g = ∇ln|A| per component, the φ components work out to
 *
 *   Im(ψ†∇ψ)/|ψ|²   = (w↑ m↑ + w↓ m↓) / ρ
 *   ½(∇×ψ†σψ)/|ψ|²  = -w↑ g↑ρ + w↓ g↓ρ + ½ s_ρ (g↑axis + g↓axis)
 *
 * i.e. the weighted average of each component's own flow as a pure spin-up or
 * spin-down orbital (`probabilityCurrentOmega` + `axialSpinCurrentOmega`),
 * plus a cross term from the sideways spin. A stretched state (one weight 0)
 * is therefore exactly the spin-current module's orbital + spin term.
 *
 * `bohrRadius` and `softening` work as in `logAmplitudeGradient`; the orbital
 * term m/(ρ² + ε) uses the same ε.
 */
export function fineStructureOmega(
  state: FineStructureNumbers,
  { bohrRadius = 1, softening = 0 }: LogAmplitudeGradientOptions = {},
): (r: number, polar: number) => number {
  const { up, down } = spinorComponents(state)
  const gradientOf = ({ m, amplitude }: SpinorComponent): GradientAt =>
    amplitude === 0
      ? () => ({ rho: 0, height: 0 })
      : logAmplitudeGradient(
          { n: state.n, l: state.l, m },
          { bohrRadius, softening },
        )
  const upGradientAt = gradientOf(up)
  const downGradientAt = gradientOf(down)
  const spinAt = spinDirection(state)
  // the flow of one component on its own, as a pure spin-up or -down orbital
  const pureComponentOmega = (
    m: number,
    gradient: CylindricalGradient,
    rho: number,
    spinProjection: number,
  ) =>
    probabilityCurrentOmega(rho, m, softening) +
    axialSpinCurrentOmega(gradient, rho, spinProjection)

  return (r, polar) => {
    const rho = r * Math.sin(polar)
    if (rho === 0) return 0
    const spin = spinAt(polar)
    const upWeight = (1 + spin.axial) / 2
    const downWeight = (1 - spin.axial) / 2
    // a component at its own node contributes nothing (w → 0 faster than g grows)
    const upGradient = upWeight === 0 ? undefined : upGradientAt(r, polar)
    const downGradient = downWeight === 0 ? undefined : downGradientAt(r, polar)

    const upOmega = upGradient
      ? upWeight * pureComponentOmega(up.m, upGradient, rho, SPIN_UP)
      : 0
    const downOmega = downGradient
      ? downWeight * pureComponentOmega(down.m, downGradient, rho, SPIN_DOWN)
      : 0
    const crossOmega =
      upGradient && downGradient
        ? (spin.rho * (upGradient.height + downGradient.height)) / (2 * rho)
        : 0
    return upOmega + downOmega + crossOmega
  }
}
