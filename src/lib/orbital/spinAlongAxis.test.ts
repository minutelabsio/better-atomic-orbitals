import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { orbitalShape } from './orbitalShape.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { spinAlongAxis } from './spinAlongAxis.js'

const uniforms = drawParticleUniforms(300, seededRng(3))

describe('spinAlongAxis', () => {
  it('gives every particle of a stretched state the same value (one color)', () => {
    for (const l of [0, 1, 2]) {
      const up = orbitalShape({ n: 3, l, j: l + 0.5, mj: l + 0.5 }, uniforms)
      const down = orbitalShape({ n: 3, l, j: l + 0.5, mj: -l - 0.5 }, uniforms)
      expect(spinAlongAxis(up).every((s) => s === 1)).toBe(true)
      expect(spinAlongAxis(down).every((s) => s === -1)).toBe(true)
    }
  })

  it('spans up to down in a mixed state: 2p1/2 m_j = ½ has cos 2θ', () => {
    const shape = orbitalShape({ n: 2, l: 1, j: 0.5, mj: 0.5 }, uniforms)
    const along = spinAlongAxis(shape)
    along.forEach((s, i) => {
      expect(s).toBeCloseTo(Math.cos(2 * shape.polar[i]!), 5)
    })
    expect(Math.min(...along)).toBeLessThan(-0.9)
    expect(Math.max(...along)).toBeGreaterThan(0.9)
  })
})
