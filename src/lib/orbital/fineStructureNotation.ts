import {
  type FineStructureNumbers,
  isValidFineStructure,
} from './fineStructure.js'
import { lFromLetter, lLetter } from './orbitalCatalog'

/**
 * Compact fine-structure notation for URLs: n, spdf letter, j, `m`, m_j, with
 * the half-integers as fractions: `2p3/2m1/2`, `2p1/2m-1/2`, `1s1/2m1/2`.
 * Distinct from the |n l m⟩ notation (`2p1`), which has no `/`.
 */

/** e.g. 1.5 → `3/2`, -0.5 → `-1/2` */
export function formatHalfInteger(value: number): string {
  return `${2 * value}/2`
}

export function formatFineStructureNotation({
  n,
  l,
  j,
  mj,
}: FineStructureNumbers): string {
  return `${n}${lLetter(l)}${formatHalfInteger(j)}m${formatHalfInteger(mj)}`
}

const NOTATION = /^(\d+)([a-z])(\d+)\/2m(-?\d+)\/2$/

/** Parse the notation; undefined if malformed or not a valid state. */
export function parseFineStructureNotation(
  text: string,
): FineStructureNumbers | undefined {
  const match = NOTATION.exec(text.trim().toLowerCase())
  if (!match) return undefined
  const [, nText, letter, twoJText, twoMjText] = match
  const l = lFromLetter(letter!)
  if (l === undefined) return undefined
  const state = {
    n: Number(nText),
    l,
    j: Number(twoJText) / 2,
    mj: Number(twoMjText) / 2,
  }
  return isValidFineStructure(state) ? state : undefined
}
