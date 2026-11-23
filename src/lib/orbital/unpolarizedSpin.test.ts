import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { unpolarizedSpinLabels } from './unpolarizedSpin.js'

describe('unpolarizedSpinLabels', () => {
  it('labels about half the particles up, the rest down', () => {
    const count = 20000
    const labels = unpolarizedSpinLabels(
      drawParticleUniforms(count, seededRng(8)).uSpin,
    )
    expect(labels.every((s) => s === 1 || s === -1)).toBe(true)
    const fractionUp = labels.filter((s) => s === 1).length / count
    // σ = √(¼/20000) ≈ 0.0035
    expect(Math.abs(fractionUp - 0.5)).toBeLessThan(0.015)
  })

  it('labels by uSpin alone: below ½ is up', () => {
    expect(Array.from(unpolarizedSpinLabels([0, 0.49, 0.5, 0.99]))).toEqual([
      1, 1, -1, -1,
    ])
  })
})
