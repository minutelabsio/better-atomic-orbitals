import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { orbitalShape } from './orbitalShape.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { mixShapes } from './shapeMix.js'
import { spinAlongAxis } from './spinAlongAxis.js'
import { createSpinAlongAxisResolver } from './spinAlongAxisOfState.js'

const COUNT = 200
const uniforms = drawParticleUniforms(COUNT, seededRng(4))
const plain = orbitalShape({ n: 2, l: 1, m: 1 }, uniforms)
const fine = orbitalShape({ n: 2, l: 1, j: 1.5, mj: 0.5 }, uniforms)

describe('createSpinAlongAxisResolver', () => {
  it('has no spin for a plain orbital with spin off', () => {
    const resolve = createSpinAlongAxisResolver(COUNT)
    expect(resolve({ shape: plain, m: 1, spin: 0 })).toBeUndefined()
  })

  it('is uniformly ±1 for a plain orbital with spin up or down', () => {
    const resolve = createSpinAlongAxisResolver(COUNT)
    expect(Array.from(resolve({ shape: plain, m: 1, spin: 1 })!)).toEqual(
      new Array(COUNT).fill(1),
    )
    expect(Array.from(resolve({ shape: plain, m: 1, spin: -1 })!)).toEqual(
      new Array(COUNT).fill(-1),
    )
  })

  it('reads a fine-structure state’s field, and returns the same array again', () => {
    const resolve = createSpinAlongAxisResolver(COUNT)
    const first = resolve({ shape: fine, m: 0, spin: 0 })
    expect(Array.from(first!)).toEqual(Array.from(spinAlongAxis(fine)))
    expect(resolve({ shape: { ...fine }, m: 0, spin: 0 })).toBe(first)
  })

  it('snaps to the nearer end of a morph', () => {
    const resolve = createSpinAlongAxisResolver(COUNT)
    const fineField = resolve({ shape: fine, m: 0, spin: 0 })
    const early = { shape: mixShapes(plain, fine, 0.3), m: 0.7, spin: 0 }
    const late = { shape: mixShapes(plain, fine, 0.7), m: 0.3, spin: 0 }
    expect(resolve(early)).toBeUndefined()
    expect(resolve(late)).toBe(fineField)
  })
})
