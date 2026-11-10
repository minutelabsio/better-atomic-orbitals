import { formatOrbitalNotation } from '../orbital/orbitalNotation'
import type { QuantumNumbers } from '../orbital/quantumNumbers'
import { ORBITAL_PARAM, orbitalFromParam } from './orbitalParam'
import { type HistoryMode, searchParams, setParam } from './url.svelte'

/** The selected orbital, read from the URL. Reactive when called in `$derived`/templates. */
export function currentOrbital(): QuantumNumbers {
  return orbitalFromParam(searchParams().get(ORBITAL_PARAM))
}

/** Select an orbital by writing it to the URL. */
export function selectOrbital(
  orbital: QuantumNumbers,
  mode?: HistoryMode,
): void {
  setParam(ORBITAL_PARAM, formatOrbitalNotation(orbital), mode)
}

/** Rewrite `?o=` to match what's shown (adds it if missing, fixes invalid links). */
export function canonicalizeOrbitalParam(): void {
  const shown = formatOrbitalNotation(currentOrbital())
  if (searchParams().get(ORBITAL_PARAM) !== shown)
    selectOrbital(currentOrbital())
}
