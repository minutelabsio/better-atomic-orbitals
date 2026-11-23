import type { HydrogenState } from '../orbital/fineStructure'
import { formatHydrogenStateNotation } from '../orbital/hydrogenStateNotation'
import { ORBITAL_PARAM, orbitalFromParam } from './orbitalParam'
import { type HistoryMode, searchParams, setParam } from './url.svelte'

/** The selected orbital, read from the URL. Reactive when called in `$derived`/templates. */
export function currentOrbital(): HydrogenState {
  return orbitalFromParam(searchParams().get(ORBITAL_PARAM))
}

/** Select an orbital by writing it to the URL. */
export function selectOrbital(
  orbital: HydrogenState,
  mode?: HistoryMode,
): void {
  setParam(ORBITAL_PARAM, formatHydrogenStateNotation(orbital), mode)
}

/** Rewrite `?o=` to match what's shown (adds it if missing, fixes invalid links). */
export function canonicalizeOrbitalParam(): void {
  const shown = formatHydrogenStateNotation(currentOrbital())
  if (searchParams().get(ORBITAL_PARAM) !== shown)
    selectOrbital(currentOrbital())
}
