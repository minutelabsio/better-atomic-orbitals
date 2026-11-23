import type { FineStructureNumbers } from './fineStructure.js'
import { formatHalfInteger } from './fineStructureNotation.js'
import { lLetter } from './orbitalCatalog'

/** Highest shell whose fine-structure states the picker lists (links may go higher). */
export const FINE_STRUCTURE_MAX_N = 3

/** e.g. `2p3/2 mj=+1/2`. */
export function fineStructureLabel({
  n,
  l,
  j,
  mj,
}: FineStructureNumbers): string {
  const sign = mj > 0 ? '+' : ''
  return `${n}${lLetter(l)}${formatHalfInteger(j)} mj=${sign}${formatHalfInteger(mj)}`
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** j = l ± ½, only + for s states. */
const jValues = (l: number): number[] => (l === 0 ? [0.5] : [l - 0.5, l + 0.5])

/** -j, -j + 1, ..., j */
const mjValues = (j: number): number[] =>
  Array.from({ length: 2 * j + 1 }, (_, i) => i - j)

/** Every fine-structure state with n ≤ maxN, ordered n, l, j, m_j. */
export function allFineStructureStates(maxN: number): FineStructureNumbers[] {
  return range(1, maxN).flatMap((n) =>
    range(0, n - 1).flatMap((l) =>
      jValues(l).flatMap((j) => mjValues(j).map((mj) => ({ n, l, j, mj }))),
    ),
  )
}
