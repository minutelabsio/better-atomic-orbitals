import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { orbitalShape } from './orbitalShape.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { spinUpSwirl } from './spinSwirl.js'
import { probabilityCurrentOmega } from './velocity.js'

const COUNT = 400
const SOFTENING = 0.02
const uniforms = drawParticleUniforms(COUNT, seededRng(5))

describe('spinUpSwirl', () => {
  it('for 1s is 1/r in units of the Bohr radius (ω scales as 1/length²)', () => {
    const shape = orbitalShape({ n: 1, l: 0, m: 0 }, uniforms)
    const swirl = spinUpSwirl(shape, 0)
    const a = shape.bohrRadius
    for (let i = 0; i < COUNT; i += 17) {
      const rAtomic = shape.r[i]! / a
      expect(swirl[i]! * a * a).toBeCloseTo(1 / rAtomic, 3)
    }
  })

  it('cancels the softened orbital term for 2p(+1) spin up, leaving 1/(2r)', () => {
    const shape = orbitalShape({ n: 2, l: 1, m: 1 }, uniforms)
    const swirl = spinUpSwirl(shape, SOFTENING)
    const a = shape.bohrRadius
    for (let i = 0; i < COUNT; i += 13) {
      const r = shape.r[i]!
      const rho = r * Math.sin(shape.polar[i]!)
      const total = probabilityCurrentOmega(rho, 1, SOFTENING) + swirl[i]!
      // 2p(+1) has no origin or node terms, so nothing else is softened
      expect(total).toBeCloseTo(1 / (2 * a * r), 3)
    }
  })

  it('stays finite everywhere when softened', () => {
    for (const orbital of [
      { n: 2, l: 0, m: 0 },
      { n: 3, l: 1, m: 0 },
      { n: 4, l: 2, m: -1 },
    ]) {
      const swirl = spinUpSwirl(orbitalShape(orbital, uniforms), SOFTENING)
      expect(swirl.every(Number.isFinite)).toBe(true)
    }
  })
})
