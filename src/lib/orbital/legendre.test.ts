import { describe, expect, it } from 'vitest'
import { expectSeriesClose, fixtures } from './__fixtures__/polynomials.js'
import { associatedLegendre, legendreDerivative } from './legendre.js'

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

describe('legendreDerivative', () => {
  const STEP = 1e-6

  it('is the polynomial part of P_l^m: P_l^m = (-1)^m sin^m θ · D_l^m', () => {
    for (const [l, m] of [
      [0, 0],
      [2, 1],
      [3, 3],
      [4, 2],
      [5, 1],
    ] as const) {
      for (const x of [-0.8, -0.1, 0.45, 0.9]) {
        const sinPower = (1 - x * x) ** (m / 2)
        expect(associatedLegendre(l, m, x)).toBeCloseTo(
          (-1) ** m * sinPower * legendreDerivative(l, m, x),
          12,
        )
      }
    }
  })

  it('has derivative legendreDerivative(l, m + 1)', () => {
    for (const [l, m] of [
      [1, 0],
      [2, 0],
      [3, 1],
      [4, 2],
      [4, 4],
    ] as const) {
      for (const x of [-0.7, 0.2, 0.85]) {
        const difference =
          (legendreDerivative(l, m, x + STEP) -
            legendreDerivative(l, m, x - STEP)) /
          (2 * STEP)
        expect(legendreDerivative(l, m + 1, x)).toBeCloseTo(difference, 6)
      }
    }
  })

  it('matches d^m P_l/dx^m in closed form for l = 3', () => {
    for (const x of [-0.6, 0.3, 1]) {
      expect(legendreDerivative(3, 0, x)).toBeCloseTo(
        (5 * x ** 3 - 3 * x) / 2,
        12,
      )
      expect(legendreDerivative(3, 1, x)).toBeCloseTo((15 * x * x - 3) / 2, 12)
      expect(legendreDerivative(3, 2, x)).toBeCloseTo(15 * x, 12)
      expect(legendreDerivative(3, 3, x)).toBe(15)
    }
  })
})
