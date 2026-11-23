import { describe, expect, it } from 'vitest'
import { Y_POLAR } from './__fixtures__/bruteForcePauliCurrent.js'
import { sphericalHarmonicPolar } from './sphericalHarmonic.js'

const POLAR_STEPS = 4000

/** ∫ |Y_l^m|² dΩ, midpoint rule. */
function normOf(polarPart: (polar: number) => number) {
  const step = Math.PI / POLAR_STEPS
  let total = 0
  for (let i = 0; i < POLAR_STEPS; i += 1) {
    const polar = (i + 0.5) * step
    total += polarPart(polar) ** 2 * Math.sin(polar) * step
  }
  return 2 * Math.PI * total
}

describe('sphericalHarmonicPolar', () => {
  it('matches the hand-written table for l ≤ 2, signs included', () => {
    for (const [key, expected] of Object.entries(Y_POLAR)) {
      const [l, m] = key.split(',').map(Number)
      const actual = sphericalHarmonicPolar(l!, m!)
      for (const polar of [0.1, 0.7, 1.3, 2.2, 3]) {
        expect(actual(polar)).toBeCloseTo(
          expected(Math.cos(polar), Math.sin(polar)),
          12,
        )
      }
    }
  })

  it('is normalized over the sphere for every m up to l = 5', () => {
    for (let l = 0; l <= 5; l += 1) {
      for (let m = -l; m <= l; m += 1) {
        expect(normOf(sphericalHarmonicPolar(l, m))).toBeCloseTo(1, 6)
      }
    }
  })

  it('is zero for |m| > l', () => {
    expect(sphericalHarmonicPolar(1, 2)(0.4)).toBe(0)
    expect(sphericalHarmonicPolar(0, -1)(0.4)).toBe(0)
  })
})
