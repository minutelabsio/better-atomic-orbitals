import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { orbitalShape } from './orbitalShape.js'
import { drawParticleUniforms } from './particleUniforms.js'

const COUNT = 500
const uniforms = drawParticleUniforms(COUNT, seededRng(1))

const rankOrder = (values: ArrayLike<number>) =>
  Array.from({ length: values.length }, (_, i) => i).sort(
    (i, j) => values[i]! - values[j]!,
  )

describe('orbitalShape', () => {
  it('maps the same uniforms to the same shape', () => {
    const a = orbitalShape({ n: 3, l: 1, m: 1 }, uniforms)
    const b = orbitalShape({ n: 3, l: 1, m: 1 }, uniforms)
    expect(a.r).toEqual(b.r)
    expect(a.polar).toEqual(b.polar)
  })

  it.each([
    { n: 1, l: 0, m: 0 },
    { n: 3, l: 2, m: 0 },
    { n: 4, l: 0, m: 0 },
  ])('keeps each particle at the same radial rank in $n,$l,$m', (orbital) => {
    const { r } = orbitalShape(orbital, uniforms)
    // r is a monotone function of uR (ties only from the far-tail clamp)
    const radiiByRank = rankOrder(uniforms.uR).map((i) => r[i]!)
    const isNonDecreasing = radiiByRank.every(
      (value, k) => k === 0 || value >= radiiByRank[k - 1]!,
    )
    expect(isNonDecreasing).toBe(true)
  })

  it('samples a j = ½ state like an s state: polar angle uniform in cos θ', () => {
    const p = orbitalShape({ n: 2, l: 1, j: 0.5, mj: 0.5 }, uniforms)
    const s = orbitalShape({ n: 2, l: 0, m: 0 }, uniforms)
    for (let i = 0; i < COUNT; i += 7) {
      expect(p.polar[i]).toBeCloseTo(s.polar[i]!, 2)
    }
  })

  it('samples a stretched fine-structure state like its plain orbital', () => {
    const fine = orbitalShape({ n: 3, l: 2, j: 2.5, mj: -2.5 }, uniforms)
    const plain = orbitalShape({ n: 3, l: 2, m: -2 }, uniforms)
    for (let i = 0; i < COUNT; i += 7) {
      expect(fine.r[i]).toBe(plain.r[i])
      expect(fine.polar[i]).toBeCloseTo(plain.polar[i]!, 5)
    }
  })
})
