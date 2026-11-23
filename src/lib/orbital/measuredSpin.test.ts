import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { spinorComponents } from './clebschGordan.js'
import type { FineStructureNumbers } from './fineStructure.js'
import { measuredSpin, spinUpProbability } from './measuredSpin.js'
import { orbitalShape } from './orbitalShape.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { sphericalHarmonicPolar } from './sphericalHarmonic.js'

const COUNT = 20000
const BINS = 10
// a binned fraction from ~7k-13k samples has σ ≈ 0.003-0.004
const BIN_TOLERANCE = 0.015
const FRACTION_TOLERANCE = 0.015
const uniforms = drawParticleUniforms(COUNT, seededRng(17))

const STATES: FineStructureNumbers[] = [
  { n: 2, l: 1, j: 0.5, mj: 0.5 },
  { n: 2, l: 1, j: 1.5, mj: 0.5 },
  { n: 3, l: 2, j: 2.5, mj: -0.5 },
  { n: 3, l: 2, j: 1.5, mj: 1.5 },
]

const label = ({ n, l, j, mj }: FineStructureNumbers) =>
  `n=${n} l=${l} j=${j} mj=${mj}`

/** Fraction of `polars` in each of BINS equal bins over [0, π]. */
function histogram(polars: number[]): number[] {
  const counts = new Array<number>(BINS).fill(0)
  for (const polar of polars) {
    const bin = Math.min(BINS - 1, Math.floor((polar / Math.PI) * BINS))
    counts[bin]! += 1
  }
  return counts.map((c) => c / polars.length)
}

/** Each bin's share of the density |Y_l^m|² sin θ, midpoint rule. */
function expectedHistogram(l: number, m: number): number[] {
  const steps = 200
  const polarPart = sphericalHarmonicPolar(l, m)
  const binMass = Array.from({ length: BINS }, (_, bin) => {
    const width = Math.PI / BINS / steps
    let mass = 0
    for (let k = 0; k < steps; k += 1) {
      const polar = (bin * steps + k + 0.5) * width
      mass += polarPart(polar) ** 2 * Math.sin(polar) * width
    }
    return mass
  })
  const total = binMass.reduce((a, b) => a + b, 0)
  return binMass.map((mass) => mass / total)
}

describe('measuredSpin', () => {
  for (const state of STATES) {
    describe(label(state), () => {
      const shape = orbitalShape(state, uniforms)
      const spins = measuredSpin(shape, uniforms.uSpin)
      const { up, down } = spinorComponents(state)
      const polarsWith = (spin: number) =>
        Array.from(shape.polar).filter((_, i) => spins[i] === spin)

      it('is ±1 only, up for the overall fraction |c↑|²', () => {
        expect(spins.every((s) => s === 1 || s === -1)).toBe(true)
        const fractionUp = polarsWith(1).length / COUNT
        expect(Math.abs(fractionUp - up.amplitude ** 2)).toBeLessThan(
          FRACTION_TOLERANCE,
        )
      })

      it('spreads the up spheres as |Y_l^(mj-½)|² sin θ, the down ones as |Y_l^(mj+½)|² sin θ', () => {
        const pairs = [
          [histogram(polarsWith(1)), expectedHistogram(state.l, up.m)],
          [histogram(polarsWith(-1)), expectedHistogram(state.l, down.m)],
        ] as const
        for (const [actual, expected] of pairs) {
          actual.forEach((fraction, bin) => {
            expect(Math.abs(fraction - expected[bin]!)).toBeLessThan(
              BIN_TOLERANCE,
            )
          })
        }
      })
    })
  }

  it('makes 2p1/2 mj=½ a p0 dumbbell up and a p(+1) torus down', () => {
    const shape = orbitalShape({ n: 2, l: 1, j: 0.5, mj: 0.5 }, uniforms)
    const spins = measuredSpin(shape, uniforms.uSpin)
    const meanCos2 = (spin: number) => {
      const cos2 = Array.from(shape.polar)
        .filter((_, i) => spins[i] === spin)
        .map((polar) => Math.cos(polar) ** 2)
      return cos2.reduce((a, b) => a + b, 0) / cos2.length
    }
    // ⟨cos²θ⟩ is 3/5 for p0 (along the axis) and 1/5 for p(±1) (round the equator)
    expect(meanCos2(1)).toBeCloseTo(3 / 5, 1)
    expect(meanCos2(-1)).toBeCloseTo(1 / 5, 1)
  })

  it('gives every particle of a stretched state the same spin', () => {
    const up = orbitalShape({ n: 3, l: 2, j: 2.5, mj: 2.5 }, uniforms)
    const down = orbitalShape({ n: 3, l: 2, j: 2.5, mj: -2.5 }, uniforms)
    expect(measuredSpin(up, uniforms.uSpin).every((s) => s === 1)).toBe(true)
    expect(measuredSpin(down, uniforms.uSpin).every((s) => s === -1)).toBe(true)
  })
})

describe('spinUpProbability', () => {
  it('is the weight of the up component: cos²θ in 2p1/2 mj=½', () => {
    const at = spinUpProbability({ l: 1, j: 0.5, mj: 0.5 })
    for (const polar of [0.1, 0.8, 1.5, 2.6]) {
      expect(at(polar)).toBeCloseTo(Math.cos(polar) ** 2, 12)
    }
  })

  it('falls back to the overall up weight on the axis of a state with no density there', () => {
    // 3d3/2 mj=3/2: Y_2^1 up and Y_2^2 down both vanish on the axis
    const state = { l: 2, j: 1.5, mj: 1.5 }
    expect(spinUpProbability(state)(0)).toBeCloseTo(
      spinorComponents(state).up.amplitude ** 2,
      14,
    )
  })
})
