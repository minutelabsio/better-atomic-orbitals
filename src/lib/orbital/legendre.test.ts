import { describe, expect, it } from 'vitest'
import { expectSeriesClose, fixtures } from './__fixtures__/polynomials.js'
import { associatedLegendre } from './legendre.js'

describe('associatedLegendre', () => {
  it.each(fixtures.legendre)('matches SciPy for l=$l m=$m', ({
    l,
    m,
    x,
    value,
  }) => {
    expectSeriesClose(
      x.map((xi) => associatedLegendre(l, m, xi)),
      value,
    )
  })

  it('treats negative m as |m|', () => {
    for (const x of [-0.9, -0.2, 0.3, 1]) {
      expect(associatedLegendre(4, -2, x)).toBe(associatedLegendre(4, 2, x))
    }
  })

  it('is zero for |m| > l', () => {
    expect(associatedLegendre(2, 3, 0.5)).toBe(0)
    expect(associatedLegendre(2, -3, 0.5)).toBe(0)
  })

  it('matches the closed forms for l <= 2 (with Condon-Shortley phase)', () => {
    for (const x of [-1, -0.4, 0, 0.6, 1]) {
      const s = Math.sqrt(1 - x * x)
      expect(associatedLegendre(0, 0, x)).toBe(1)
      expect(associatedLegendre(1, 0, x)).toBeCloseTo(x, 12)
      expect(associatedLegendre(1, 1, x)).toBeCloseTo(-s, 12)
      expect(associatedLegendre(2, 0, x)).toBeCloseTo((3 * x * x - 1) / 2, 12)
      expect(associatedLegendre(2, 1, x)).toBeCloseTo(-3 * x * s, 12)
      expect(associatedLegendre(2, 2, x)).toBeCloseTo(3 * (1 - x * x), 12)
    }
  })
})
