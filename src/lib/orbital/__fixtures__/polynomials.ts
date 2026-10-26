import { expect } from 'vitest'
import data from './polynomials.json'

/** SciPy reference values; regenerate with `uv run scripts/gen-polynomial-fixtures.py`. */
export const fixtures = data

/**
 * Assert each sample matches its reference to `rtol` relative to the largest
 * |value| in the series, so samples near a root aren't held to an impossible
 * pointwise relative tolerance.
 */
export function expectSeriesClose(
  actual: number[],
  expected: number[],
  rtol = 1e-10,
): void {
  const scale = Math.max(1, ...expected.map(Math.abs))
  for (let i = 0; i < expected.length; i++) {
    const a = actual[i] as number
    const e = expected[i] as number
    expect(
      Math.abs(a - e),
      `index ${i}: got ${a}, want ${e}`,
    ).toBeLessThanOrEqual(rtol * scale)
  }
}
