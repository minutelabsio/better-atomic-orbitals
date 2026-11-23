import type { FineStructureNumbers } from './fineStructure.js'
import { fineStructureOmega } from './fineStructureCurrent.js'
import type { OrbitalShape } from './orbitalShape.js'

/**
 * Each particle's full angular velocity in a fine-structure state: orbital
 * and spin parts of the Pauli current together (see `fineStructureOmega`), so
 * the caller adds no m/ρ² term of its own.
 *
 * World units with a₀ = `shape.bohrRadius`, and `softening` (world length²)
 * the one the orbital term uses, as in `spinUpSwirl`.
 */
export function fineStructureSwirl(
  { orbital, bohrRadius, r, polar }: OrbitalShape<FineStructureNumbers>,
  softening: number,
): Float32Array {
  const omegaAt = fineStructureOmega(orbital, { bohrRadius, softening })
  return Float32Array.from({ length: r.length }, (_, i) =>
    omegaAt(r[i]!, polar[i]!),
  )
}
