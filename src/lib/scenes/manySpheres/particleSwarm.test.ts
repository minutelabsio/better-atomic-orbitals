import { describe, expect, it } from 'vitest'
import { seededRng } from '../../orbital/__fixtures__/seededRng.js'
import { orbitalShape } from '../../orbital/orbitalShape.js'
import type { QuantumNumbers } from '../../orbital/quantumNumbers.js'
import { SPIN_DOWN, SPIN_UP } from '../../orbital/spinCurrent.js'
import { unpolarizedSpinLabels } from '../../orbital/unpolarizedSpin.js'
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

const SEPARATION_COUNT = 50

describe('particleSwarm.writeSpheres', () => {
  it('slides each sphere along world Y by its separation, leaving the motion alone', () => {
    const swarm = createParticleSwarm({
      count: SEPARATION_COUNT,
      rng: seededRng(2),
    })
    const shape = orbitalShape({ n: 2, l: 1, j: 0.5, mj: 0.5 }, swarm.uniforms)
    swarm.setOrbitalState({ shape, m: 0, spin: 0 })
    const direction = Float32Array.from({ length: SEPARATION_COUNT }, (_, i) =>
      i % 2 === 0 ? 1 : -1,
    )
    const together = new Float32Array(SEPARATION_COUNT * 4)
    const apart = new Float32Array(SEPARATION_COUNT * 4)
    swarm.writeSpheres(together, { sphereRadius: 0.01 })
    swarm.writeSpheres(apart, {
      sphereRadius: 0.01,
      separation: { distance: -0.5, direction },
    })
    for (let i = 0; i < SEPARATION_COUNT; i += 1) {
      const o = i * 4
      expect(apart[o]).toBe(together[o])
      expect(apart[o + 1]).toBeCloseTo(
        together[o + 1]! - 0.5 * direction[i]!,
        6,
      )
      expect(apart[o + 2]).toBe(together[o + 2])
    }
    // drawing apart didn't move anything: drawing together again matches
    const again = new Float32Array(SEPARATION_COUNT * 4)
    swarm.writeSpheres(again, { sphereRadius: 0.01 })
    expect(again).toEqual(together)
  })
})

describe('particleSwarm with spin both (unpolarized)', () => {
  const orbital = { n: 2, l: 1, m: 1 }
  const swarmIn = (spin: number, unpolarized: number) => {
    const swarm = createParticleSwarm({ count: COUNT, rng: seededRng(5) })
    swarm.setOrbitalState({
      shape: orbitalShape(orbital, swarm.uniforms),
      m: orbital.m,
      spin,
      unpolarized,
    })
    return swarm
  }
  /** sphere positions after one step */
  const stepped = (swarm: ReturnType<typeof createParticleSwarm>) => {
    const out = new Float32Array(COUNT * STRIDE)
    swarm.advance(0.01)
    swarm.writeSpheres(out, STYLE)
    return out
  }

  it('moves each particle exactly as spin-current’s spin-up or spin-down swirl, by its label', () => {
    const both = swarmIn(0, 1)
    const labels = unpolarizedSpinLabels(both.uniforms.uSpin)
    const afterBoth = stepped(both)
    const afterUp = stepped(swarmIn(SPIN_UP, 0))
    const afterDown = stepped(swarmIn(SPIN_DOWN, 0))
    expect(labels.includes(1) && labels.includes(-1)).toBe(true)
    labels.forEach((label, i) => {
      const reference = label === SPIN_UP ? afterUp : afterDown
      const o = i * STRIDE
      expect(Array.from(afterBoth.subarray(o, o + STRIDE))).toEqual(
        Array.from(reference.subarray(o, o + STRIDE)),
      )
    })
  })

  it('in 1s turns spin-up particles about +Y and spin-down ones about -Y', () => {
    const swarm = createParticleSwarm({ count: COUNT, rng: seededRng(3) })
    swarm.setOrbitalState({
      shape: orbitalShape({ n: 1, l: 0, m: 0 }, swarm.uniforms),
      m: 0,
      spin: 0,
      unpolarized: 1,
    })
    const labels = unpolarizedSpinLabels(swarm.uniforms.uSpin)
    const before = new Float32Array(COUNT * STRIDE)
    const after = new Float32Array(COUNT * STRIDE)
    swarm.writeSpheres(before, STYLE)
    swarm.advance(SPEED_SCALE)
    swarm.writeSpheres(after, STYLE)

    let checked = 0
    labels.forEach((label, i) => {
      const o = i * STRIDE
      const [x, z] = [before[o]!, before[o + 2]!]
      if (Math.hypot(x, z) <= MIN_AXIS_DISTANCE) return
      const vx = (after[o]! - x) / SPEED_SCALE
      const vz = (after[o + 2]! - z) / SPEED_SCALE
      const momentumY = z * vx - x * vz
      expect(Math.sign(momentumY)).toBe(label)
      checked += 1
    })
    expect(checked).toBeGreaterThan(COUNT * 0.9)
  })
})
