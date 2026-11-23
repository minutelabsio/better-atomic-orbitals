import type { FineStructureNumbers } from './fineStructure.js'
import type { OrbitalShape } from './orbitalShape.js'
import { spinDirection } from './spinDirection.js'

/**
 * Each particle's spin component along the quantization axis, cos(tilt), in
 * a fine-structure state: +1 spin up, 0 sideways (along ê_ρ), -1 spin down.
 *
 * It depends on the polar angle alone, and a particle orbits at fixed polar
 * angle, so this is fixed for the particle's life in the state.
 */
export function spinAlongAxis({
  orbital,
  polar,
}: OrbitalShape<FineStructureNumbers>): Float32Array {
  const spinAt = spinDirection(orbital)
  return Float32Array.from(polar, (angle) => spinAt(angle).axial)
}
