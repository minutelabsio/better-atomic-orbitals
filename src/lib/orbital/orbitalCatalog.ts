import type { QuantumNumbers } from './quantumNumbers'

/** Highest shell the app offers (picker, links). */
export const MAX_N = 6

const L_LETTERS = ['s', 'p', 'd', 'f', 'g', 'h'] as const

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** spdf letter for l, falling back to `l<n>` past h. */
export function lLetter(l: number): string {
  return L_LETTERS[l] ?? `l${l}`
}

/** Inverse of lLetter for the spdfgh letters; undefined otherwise. */
export function lFromLetter(letter: string): number | undefined {
  const l = L_LETTERS.indexOf(letter as (typeof L_LETTERS)[number])
  return l === -1 ? undefined : l
}

/** e.g. `1s`, `3d m=+1`, `2p m=-1`. */
export function orbitalLabel({ n, l, m }: QuantumNumbers): string {
  const mTag = l > 0 ? ` m=${m > 0 ? '+' : ''}${m}` : ''
  return `${n}${lLetter(l)}${mTag}`
}

/** Every valid orbital with n ≤ maxN (l < n, |m| ≤ l), ordered n, l, m. */
export function allOrbitals(maxN: number): QuantumNumbers[] {
  return range(1, maxN).flatMap((n) =>
    range(0, n - 1).flatMap((l) => range(-l, l).map((m) => ({ n, l, m }))),
  )
}
