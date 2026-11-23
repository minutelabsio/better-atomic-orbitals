import { type HydrogenState, isFineStructure } from './fineStructure.js'
import {
  formatFineStructureNotation,
  parseFineStructureNotation,
} from './fineStructureNotation.js'
import { formatOrbitalNotation, parseOrbitalNotation } from './orbitalNotation'

/** URL notation for either kind of state: `3d1` or `2p3/2m1/2`. */
export function formatHydrogenStateNotation(state: HydrogenState): string {
  return isFineStructure(state)
    ? formatFineStructureNotation(state)
    : formatOrbitalNotation(state)
}

/** Parse either notation; undefined if it's neither. */
export function parseHydrogenStateNotation(
  text: string,
): HydrogenState | undefined {
  return parseOrbitalNotation(text) ?? parseFineStructureNotation(text)
}
