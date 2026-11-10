import { lFromLetter, lLetter } from './orbitalCatalog'
import type { QuantumNumbers } from './quantumNumbers'

/**
 * Compact orbital notation for URLs: n, spdf letter, m.
 * `1s`, `2p-1`, `3d1`, `3d0`. m is omitted for s and required otherwise;
 * positive m has no `+` (it would read back as a space in a query string).
 */

export function formatOrbitalNotation({ n, l, m }: QuantumNumbers): string {
  return `${n}${lLetter(l)}${l === 0 ? '' : m}`
}

const NOTATION = /^(\d+)([a-z])(-?\d+)?$/

/** Parse the notation; undefined if malformed or not a valid orbital. */
export function parseOrbitalNotation(text: string): QuantumNumbers | undefined {
  const match = NOTATION.exec(text.trim().toLowerCase())
  if (!match) return undefined
  const [, nText, letter, mText] = match
  const n = Number(nText)
  const l = lFromLetter(letter!)
  if (l === undefined || n < 1 || l >= n) return undefined
  if (l === 0)
    return mText === undefined || Number(mText) === 0
      ? { n, l, m: 0 }
      : undefined
  if (mText === undefined) return undefined
  const m = Number(mText)
  return Math.abs(m) <= l ? { n, l, m } : undefined
}
