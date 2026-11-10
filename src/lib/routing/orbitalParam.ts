import { MAX_N } from '../orbital/orbitalCatalog'
import { parseOrbitalNotation } from '../orbital/orbitalNotation'
import type { QuantumNumbers } from '../orbital/quantumNumbers'

/** Query param holding the selected orbital: `?o=3d1` (see orbitalNotation.ts). */
export const ORBITAL_PARAM = 'o'

export const DEFAULT_ORBITAL: QuantumNumbers = { n: 2, l: 1, m: 1 }

/** The orbital a param value names; missing, invalid or n > MAX_N fall back to the default. */
export function orbitalFromParam(text: string | null): QuantumNumbers {
  const parsed = text === null ? undefined : parseOrbitalNotation(text)
  return parsed && parsed.n <= MAX_N ? parsed : DEFAULT_ORBITAL
}
