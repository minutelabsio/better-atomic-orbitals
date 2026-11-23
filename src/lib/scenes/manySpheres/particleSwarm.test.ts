import { describe, expect, it } from 'vitest'
import { seededRng } from '../../orbital/__fixtures__/seededRng.js'
import { orbitalShape } from '../../orbital/orbitalShape.js'
import type { QuantumNumbers } from '../../orbital/quantumNumbers.js'
import { SPIN_UP } from '../../orbital/spinCurrent.js'
import { createParticleSwarm } from './particleSwarm.js'

const COUNT = 300
const STRIDE = 4
const SPEED_SCALE = 1e-4
const MIN_AXIS_DISTANCE = 1e-3
const STYLE = { sphereRadius: 0.01 }

/**
 * The Y component of r × v for every particle, from the sphere positions
 * written before and after one small step.
 */
function angularMomentumY(orbital: QuantumNumbers, m: number, spin: number) {
  const swarm = createParticleSwarm({ count: COUNT, rng: seededRng(3) })
  swarm.setOrbitalState({
    shape: orbitalShape(orbital, swarm.uniforms),
    m,
    spin,
  })
  const before = new Float32Array(COUNT * STRIDE)
  const after = new Float32Array(COUNT * STRIDE)
  swarm.writeSpheres(before, STYLE)
  swarm.advance(SPEED_SCALE)
  swarm.writeSpheres(after, STYLE)

  return Array.from({ length: COUNT }, (_, i) => {
    const o = i * STRIDE
    const [x, z] = [before[o]!, before[o + 2]!]
    const vx = (after[o]! - x) / SPEED_SCALE
    const vz = (after[o + 2]! - z) / SPEED_SCALE
    return { axisDistance: Math.hypot(x, z), momentumY: z * vx - x * vz }
  })
}

function expectAllAlongPlusY(samples: ReturnType<typeof angularMomentumY>) {
  const offAxis = samples.filter((s) => s.axisDistance > MIN_AXIS_DISTANCE)
  expect(offAxis.length).toBeGreaterThan(COUNT * 0.9)
  for (const { momentumY } of offAxis) {
    expect(momentumY).toBeGreaterThan(0)
  }
}

describe('particleSwarm handedness', () => {
  it('positive m circulates about +Y (r × v points along +Y)', () => {
    expectAllAlongPlusY(angularMomentumY({ n: 2, l: 1, m: 1 }, 1, 0))
  })

  it('the spin-up term alone circulates about +Y (1s)', () => {
    expectAllAlongPlusY(angularMomentumY({ n: 1, l: 0, m: 0 }, 0, SPIN_UP))
  })
})
