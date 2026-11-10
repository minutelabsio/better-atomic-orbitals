import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { orbitalShape } from './orbitalShape.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { createShapeEvaluator, mixShapes } from './shapeMix.js'

const COUNT = 500
const SAMPLE_STRIDE = 37
const uniforms = drawParticleUniforms(COUNT, seededRng(1))
const a = orbitalShape({ n: 2, l: 1, m: 0 }, uniforms)
const b = orbitalShape({ n: 3, l: 2, m: 1 }, uniforms)
const c = orbitalShape({ n: 1, l: 0, m: 0 }, uniforms)
const sampledIndices = Array.from(
  { length: Math.ceil(COUNT / SAMPLE_STRIDE) },
  (_, k) => k * SAMPLE_STRIDE,
)

describe('mixShapes', () => {
  it('returns the endpoints at k = 0 and 1', () => {
    expect(mixShapes(a, b, 0)).toBe(a)
    expect(mixShapes(a, b, 1)).toBe(b)
  })
})

describe('createShapeEvaluator', () => {
  const evaluateShape = createShapeEvaluator(COUNT)

  it('reads a plain shape in place', () => {
    expect(evaluateShape(a)).toBe(a)
  })

  it('lerps (r, polar) per particle', () => {
    const shape = evaluateShape(mixShapes(a, b, 0.25))
    for (const i of sampledIndices) {
      expect(shape.r[i]).toBeCloseTo(a.r[i]! * 0.75 + b.r[i]! * 0.25, 5)
      expect(shape.polar[i]).toBeCloseTo(
        a.polar[i]! * 0.75 + b.polar[i]! * 0.25,
        5,
      )
    }
  })

  it('evaluates nested mixes on both sides (retargeted morphs)', () => {
    const left = mixShapes(a, b, 0.5)
    const right = mixShapes(b, c, 0.5)
    const shape = evaluateShape(mixShapes(left, right, 0.5))
    for (const i of sampledIndices) {
      const leftR = (a.r[i]! + b.r[i]!) / 2
      const rightR = (b.r[i]! + c.r[i]!) / 2
      expect(shape.r[i]).toBeCloseTo((leftR + rightR) / 2, 5)
    }
  })
})
