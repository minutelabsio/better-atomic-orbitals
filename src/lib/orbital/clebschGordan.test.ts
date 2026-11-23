import { describe, expect, it } from 'vitest'
import { spinorComponents } from './clebschGordan.js'

/** Every (l, j, m_j) with l ≤ 4. */
function* fineStructureAngles() {
  for (let l = 0; l <= 4; l += 1) {
    for (const j of l === 0 ? [0.5] : [l - 0.5, l + 0.5]) {
      for (let mj = -j; mj <= j; mj += 1) {
        yield { l, j, mj }
      }
    }
  }
}

describe('spinorComponents', () => {
  it('is normalized for every state', () => {
    for (const state of fineStructureAngles()) {
      const { up, down } = spinorComponents(state)
      expect(up.amplitude ** 2 + down.amplitude ** 2).toBeCloseTo(1, 14)
    }
  })

  it('makes j = l ± ½ with the same m_j orthogonal', () => {
    for (let l = 1; l <= 4; l += 1) {
      for (let mj = -(l - 0.5); mj <= l - 0.5; mj += 1) {
        const aligned = spinorComponents({ l, j: l + 0.5, mj })
        const opposed = spinorComponents({ l, j: l - 0.5, mj })
        const overlap =
          aligned.up.amplitude * opposed.up.amplitude +
          aligned.down.amplitude * opposed.down.amplitude
        expect(overlap).toBeCloseTo(0, 14)
      }
    }
  })

  it('splits m_j into m = m_j ∓ ½ for spin up/down', () => {
    const { up, down } = spinorComponents({ l: 2, j: 1.5, mj: -0.5 })
    expect(up.m).toBe(-1)
    expect(down.m).toBe(0)
  })

  it('gives the textbook p-state coefficients (Condon–Shortley)', () => {
    const p = (j: number, mj: number) => {
      const { up, down } = spinorComponents({ l: 1, j, mj })
      return [up.amplitude, down.amplitude]
    }
    const third = Math.sqrt(1 / 3)
    const twoThirds = Math.sqrt(2 / 3)
    const expectPair = ([a, b]: number[], [c, d]: number[]) => {
      expect(a).toBeCloseTo(c!, 14)
      expect(b).toBeCloseTo(d!, 14)
    }
    expectPair(p(1.5, 1.5), [1, 0])
    expectPair(p(1.5, 0.5), [twoThirds, third])
    expectPair(p(1.5, -0.5), [third, twoThirds])
    expectPair(p(1.5, -1.5), [0, 1])
    expectPair(p(0.5, 0.5), [-third, twoThirds])
    expectPair(p(0.5, -0.5), [-twoThirds, third])
  })

  it('leaves out the impossible component of a stretched state', () => {
    for (let l = 0; l <= 4; l += 1) {
      expect(spinorComponents({ l, j: l + 0.5, mj: l + 0.5 }).down).toEqual({
        m: l + 1,
        amplitude: 0,
      })
      expect(spinorComponents({ l, j: l + 0.5, mj: -l - 0.5 }).up).toEqual({
        m: -l - 1,
        amplitude: 0,
      })
    }
  })
})
