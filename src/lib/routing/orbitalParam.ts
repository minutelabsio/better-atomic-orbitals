import type { HydrogenState } from '../orbital/fineStructure'
import { parseHydrogenStateNotation } from '../orbital/hydrogenStateNotation'
import { MAX_N } from '../orbital/orbitalCatalog'
import type { QuantumNumbers } from '../orbital/quantumNumbers'

/**
 * Query param holding the selected orbital: `?o=3d1`, or a fine-structure
 * state `?o=2p3/2m1/2` (see orbitalNotation.ts, fineStructureNotation.ts).
 */
export const ORBITAL_PARAM = 'o'

export const DEFAULT_ORBITAL: QuantumNumbers = { n: 2, l: 1, m: 1 }

/** The orbital a param value names; missing, invalid or n > MAX_N fall back to the default. */
export function orbitalFromParam(text: string | null): HydrogenState {
  const parsed = text === null ? undefined : parseHydrogenStateNotation(text)
  return parsed && parsed.n <= MAX_N ? parsed : DEFAULT_ORBITAL
}
