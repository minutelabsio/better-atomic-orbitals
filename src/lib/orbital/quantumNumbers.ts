/** Hydrogen orbital quantum numbers: n ≥ 1, 0 ≤ l < n, |m| ≤ l. */
export interface QuantumNumbers {
  n: number
  l: number
  m: number
}

export function isSameOrbital(a: QuantumNumbers, b: QuantumNumbers): boolean {
  return a.n === b.n && a.l === b.l && a.m === b.m
}

export function orbitalKey({ n, l, m }: QuantumNumbers): string {
  return `${n},${l},${m}`
}
