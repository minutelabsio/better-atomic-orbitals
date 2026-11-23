import type { QuantumNumbers } from './quantumNumbers.js'

/**
 * A spin–orbit coupled (fine-structure) hydrogen state |n l j m_j⟩, in which
 * spin up and spin down are mixed with Clebsch–Gordan weights (see
 * `clebschGordan.ts`). j = l ± ½ and m_j = -j..j are half-integers (0.5,
 * 1.5, ...), which floats hold exactly.
 */
export interface FineStructureNumbers {
  n: number
  l: number
  j: number
  mj: number
}

/** Either a spinless |n l m⟩ orbital or a fine-structure state |n l j m_j⟩. */
export type HydrogenState = QuantumNumbers | FineStructureNumbers

export function isFineStructure(
  state: HydrogenState,
): state is FineStructureNumbers {
  return 'j' in state
}

/** n ≥ 1, 0 ≤ l < n, j = l ± ½ (≥ ½), |m_j| ≤ j with m_j a half-integer. */
export function isValidFineStructure({
  n,
  l,
  j,
  mj,
}: FineStructureNumbers): boolean {
  const isHalfOdd = (x: number) => Number.isInteger(x - 0.5)
  return (
    Number.isInteger(n) &&
    Number.isInteger(l) &&
    n >= 1 &&
    l >= 0 &&
    l < n &&
    j > 0 &&
    Math.abs(j - l) === 0.5 &&
    isHalfOdd(mj) &&
    Math.abs(mj) <= j
  )
}

export function isSameHydrogenState(a: HydrogenState, b: HydrogenState) {
  return hydrogenStateKey(a) === hydrogenStateKey(b)
}

export function hydrogenStateKey(state: HydrogenState): string {
  if (isFineStructure(state)) {
    const { n, l, j, mj } = state
    return `${n},${l},j${j},${mj}`
  }
  const { n, l, m } = state
  return `${n},${l},${m}`
}
