import { describe, expect, it } from 'vitest'
import { expectSeriesClose, fixtures } from './__fixtures__/polynomials.js'
import {
  generalizedLaguerre,
  generalizedLaguerreDerivative,
} from './laguerre.js'

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

describe('generalizedLaguerreDerivative', () => {
  const STEP = 1e-5

  it('matches a central difference of generalizedLaguerre', () => {
    for (const k of [0, 1, 2, 4]) {
      for (const alpha of [1, 3, 5]) {
        for (const x of [0.3, 1.7, 6]) {
          const difference =
            (generalizedLaguerre(k, alpha, x + STEP) -
              generalizedLaguerre(k, alpha, x - STEP)) /
            (2 * STEP)
          expect(generalizedLaguerreDerivative(k, alpha, x)).toBeCloseTo(
            difference,
            5,
          )
        }
      }
    }
  })
})
