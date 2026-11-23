import { describe, expect, it } from 'vitest'
import { seededRng } from '../../orbital/__fixtures__/seededRng.js'
import { orbitalShape } from '../../orbital/orbitalShape.js'
import { createParticleSwarm } from './particleSwarm.js'

const COUNT = 50

describe('particleSwarm.writeSpheres', () => {
  it('slides each sphere along world Y by its separation, leaving the motion alone', () => {
    const swarm = createParticleSwarm({ count: COUNT, rng: seededRng(2) })
    const shape = orbitalShape({ n: 2, l: 1, j: 0.5, mj: 0.5 }, swarm.uniforms)
    swarm.setOrbitalState({ shape, m: 0, spin: 0 })
    const direction = Float32Array.from({ length: COUNT }, (_, i) =>
      i % 2 === 0 ? 1 : -1,
    )
    const together = new Float32Array(COUNT * 4)
    const apart = new Float32Array(COUNT * 4)
    swarm.writeSpheres(together, { sphereRadius: 0.01 })
    swarm.writeSpheres(apart, {
      sphereRadius: 0.01,
      separation: { distance: -0.5, direction },
    })
    for (let i = 0; i < COUNT; i += 1) {
      const o = i * 4
      expect(apart[o]).toBe(together[o])
      expect(apart[o + 1]).toBeCloseTo(
        together[o + 1]! - 0.5 * direction[i]!,
        6,
      )
      expect(apart[o + 2]).toBe(together[o + 2])
    }
    // drawing apart didn't move anything: drawing together again matches
    const again = new Float32Array(COUNT * 4)
    swarm.writeSpheres(again, { sphereRadius: 0.01 })
    expect(again).toEqual(together)
  })
})
