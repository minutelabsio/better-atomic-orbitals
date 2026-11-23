import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { fineStructureSwirl } from './fineStructureSwirl.js'
import { orbitalShape } from './orbitalShape.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { spinUpSwirl } from './spinSwirl.js'
import { probabilityCurrentOmega } from './velocity.js'

const COUNT = 400
const SOFTENING = 0.02
const uniforms = drawParticleUniforms(COUNT, seededRng(9))

describe('fineStructureSwirl', () => {
  it('for 2p3/2 m_j = 3/2 equals 2p(+1) with spin up, particle by particle', () => {
    const fine = orbitalShape({ n: 2, l: 1, j: 1.5, mj: 1.5 }, uniforms)
    const plain = orbitalShape({ n: 2, l: 1, m: 1 }, uniforms)
    const fineSwirl = fineStructureSwirl(fine, SOFTENING)
    const spinSwirl = spinUpSwirl(plain, SOFTENING)
    for (let i = 0; i < COUNT; i += 1) {
      const rho = plain.r[i]! * Math.sin(plain.polar[i]!)
      const plainOmega =
        probabilityCurrentOmega(rho, 1, SOFTENING) + spinSwirl[i]!
      // the two shapes' polar tables agree to float precision, not bit for bit
      expect(fineSwirl[i]).toBeCloseTo(plainOmega, 3)
    }
  })

  it('is 1/(2r) per Bohr radius² for 2p3/2 m_j = 3/2 (Table 1), in world units', () => {
    const shape = orbitalShape({ n: 2, l: 1, j: 1.5, mj: 1.5 }, uniforms)
    const swirl = fineStructureSwirl(shape, 0)
    const a = shape.bohrRadius
    for (let i = 0; i < COUNT; i += 11) {
      expect(swirl[i]! * a * a).toBeCloseTo(1 / (2 * (shape.r[i]! / a)), 3)
    }
  })
})
