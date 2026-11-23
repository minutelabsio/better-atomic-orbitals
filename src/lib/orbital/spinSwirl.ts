import { logAmplitudeGradient } from './logAmplitudeGradient.js'
import type { OrbitalShape } from './orbitalShape.js'
import type { QuantumNumbers } from './quantumNumbers.js'
import { axialSpinCurrentOmega, SPIN_UP } from './spinCurrent.js'

/**
 * Each particle's spin-term angular velocity in `shape`, for spin up along the
 * axis; scale it by the spin projection for spin down (-1) or a fade (0..1).
 *
 * Computed in world units with a₀ = `shape.bohrRadius`, the same units the
 * orbital term m/ρ² uses, so the two add up with their physical proportions
 * and one speed constant serves both. `softening` (world length²) should be
 * the one the orbital term uses: then for spin up in m = +l states the spin
 * term's -|m|/(ρ² + ε) cancels m/(ρ² + ε) exactly, as it does unsoftened.
 */
export function spinUpSwirl(
  { orbital, bohrRadius, r, polar }: OrbitalShape<QuantumNumbers>,
  softening: number,
): Float32Array {
  const gradientAt = logAmplitudeGradient(orbital, { bohrRadius, softening })
  return Float32Array.from({ length: r.length }, (_, i) => {
    const rho = r[i]! * Math.sin(polar[i]!)
    return axialSpinCurrentOmega(gradientAt(r[i]!, polar[i]!), rho, SPIN_UP)
  })
}
