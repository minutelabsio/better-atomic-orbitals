import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { measuredSpin } from './measuredSpin.js'
import { orbitalShape } from './orbitalShape.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { mixShapes } from './shapeMix.js'
import { spinAlongAxis } from './spinAlongAxis.js'
import { createSpinFieldResolver } from './spinFieldOfState.js'
import { unpolarizedSpinLabels } from './unpolarizedSpin.js'

const COUNT = 200
const uniforms = drawParticleUniforms(COUNT, seededRng(4))
const plain = orbitalShape({ n: 2, l: 1, m: 1 }, uniforms)
const fine = orbitalShape({ n: 2, l: 1, j: 1.5, mj: 0.5 }, uniforms)
const newResolver = () =>
  createSpinFieldResolver({ count: COUNT, uSpin: uniforms.uSpin })

describe('createSpinFieldResolver', () => {
  it('has no spin for a plain orbital with spin off', () => {
    const resolve = newResolver()
    for (const field of ['measured', 'average'] as const) {
      expect(resolve({ shape: plain, m: 1, spin: 0 }, field)).toBeUndefined()
    }
  })

  it('is uniformly ±1 for a plain orbital with spin up or down', () => {
    const resolve = newResolver()
    for (const field of ['measured', 'average'] as const) {
      expect(
        Array.from(resolve({ shape: plain, m: 1, spin: 1 }, field)!),
      ).toEqual(new Array(COUNT).fill(1))
      expect(
        Array.from(resolve({ shape: plain, m: 1, spin: -1 }, field)!),
      ).toEqual(new Array(COUNT).fill(-1))
    }
  })

  it('gives each particle its own fixed label for a plain orbital with spin both', () => {
    const resolve = newResolver()
    const labels = Array.from(unpolarizedSpinLabels(uniforms.uSpin))
    for (const field of ['measured', 'average'] as const) {
      const state = { shape: plain, m: 1, spin: 0, unpolarized: 1 }
      expect(Array.from(resolve(state, field)!)).toEqual(labels)
    }
    // halfway through fading "both" out, it snaps to the nearer end
    expect(
      resolve({ shape: plain, m: 1, spin: 0, unpolarized: 0.4 }, 'measured'),
    ).toBeUndefined()
  })

  it('reads a fine-structure state’s fields, and returns the same arrays again', () => {
    const resolve = newResolver()
    const state = { shape: fine, m: 0, spin: 0 }
    const average = resolve(state, 'average')
    const measured = resolve(state, 'measured')
    expect(Array.from(average!)).toEqual(Array.from(spinAlongAxis(fine)))
    expect(Array.from(measured!)).toEqual(
      Array.from(measuredSpin(fine, uniforms.uSpin)),
    )
    expect(resolve({ ...state, shape: { ...fine } }, 'average')).toBe(average)
    expect(resolve({ ...state, shape: { ...fine } }, 'measured')).toBe(measured)
  })

  it('snaps to the nearer end of a morph', () => {
    const resolve = newResolver()
    const fineField = resolve({ shape: fine, m: 0, spin: 0 }, 'measured')
    const early = { shape: mixShapes(plain, fine, 0.3), m: 0.7, spin: 0 }
    const late = { shape: mixShapes(plain, fine, 0.7), m: 0.3, spin: 0 }
    expect(resolve(early, 'measured')).toBeUndefined()
    expect(resolve(late, 'measured')).toBe(fineField)
  })
})
