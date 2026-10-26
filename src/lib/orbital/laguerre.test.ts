import { describe, expect, it } from 'vitest'
import { expectSeriesClose, fixtures } from './__fixtures__/polynomials.js'
import { generalizedLaguerre } from './laguerre.js'

describe('generalizedLaguerre', () => {
  it.each(fixtures.laguerre)('matches SciPy for k=$k alpha=$alpha', ({
    k,
    alpha,
    x,
    value,
  }) => {
    expectSeriesClose(
      x.map((xi) => generalizedLaguerre(k, alpha, xi)),
      value,
    )
  })

  it('matches the closed forms for k <= 2', () => {
    for (const alpha of [0, 1, 3, 5]) {
      for (const x of [0, 0.7, 2, 9]) {
        expect(generalizedLaguerre(0, alpha, x)).toBe(1)
        expect(generalizedLaguerre(1, alpha, x)).toBeCloseTo(1 + alpha - x, 12)
        expect(generalizedLaguerre(2, alpha, x)).toBeCloseTo(
          ((alpha + 1) * (alpha + 2)) / 2 - (alpha + 2) * x + (x * x) / 2,
          12,
        )
      }
    }
  })
})
