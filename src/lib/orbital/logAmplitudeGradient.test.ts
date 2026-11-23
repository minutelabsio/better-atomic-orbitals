import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { generalizedLaguerre } from './laguerre.js'
import { associatedLegendre } from './legendre.js'
import { logAmplitudeGradient } from './logAmplitudeGradient.js'
import type { QuantumNumbers } from './quantumNumbers.js'

const POINTS = 200
const STEP = 1e-6
/** skip points within ~1/this of a node, where the gradient blows up */
const MAX_REFERENCE_GRADIENT = 50

/** The slow, obvious reference: ln|ψ_nlm| straight from its definition. */
function logAmplitude(
  { n, l, m }: QuantumNumbers,
  rho: number,
  height: number,
) {
  const r = Math.hypot(rho, height)
  const radial =
    r ** l *
    Math.exp(-r / n) *
    generalizedLaguerre(n - l - 1, 2 * l + 1, (2 * r) / n)
  return Math.log(Math.abs(radial * associatedLegendre(l, m, height / r)))
}

function centralDifferenceGradient(
  orbital: QuantumNumbers,
  rho: number,
  height: number,
) {
  const f = (p: number, h: number) => logAmplitude(orbital, p, h)
  return {
    rho: (f(rho + STEP, height) - f(rho - STEP, height)) / (2 * STEP),
    height: (f(rho, height + STEP) - f(rho, height - STEP)) / (2 * STEP),
  }
}

function* randomPoints(seed: number, maxRadius: number) {
  const rng = seededRng(seed)
  for (let i = 0; i < POINTS; i += 1) {
    yield { r: 0.1 + rng() * maxRadius, polar: 0.02 + rng() * (Math.PI - 0.04) }
  }
}

const ORBITALS: QuantumNumbers[] = [
  { n: 1, l: 0, m: 0 },
  { n: 2, l: 0, m: 0 },
  { n: 2, l: 1, m: -1 },
  { n: 3, l: 1, m: 0 },
  { n: 3, l: 2, m: 1 },
  { n: 4, l: 2, m: -2 },
  { n: 4, l: 3, m: 1 },
  { n: 5, l: 4, m: 0 },
]

describe('logAmplitudeGradient', () => {
  it.each(
    ORBITALS,
  )('matches a central difference of ln|ψ| for n=$n l=$l m=$m', (orbital) => {
    const gradient = logAmplitudeGradient(orbital)
    let checked = 0
    for (const { r, polar } of randomPoints(
      orbital.n * 10 + orbital.l,
      6 * orbital.n * orbital.n,
    )) {
      const rho = r * Math.sin(polar)
      const height = r * Math.cos(polar)
      const reference = centralDifferenceGradient(orbital, rho, height)
      const scale = Math.max(
        1,
        Math.abs(reference.rho),
        Math.abs(reference.height),
      )
      if (!(scale < MAX_REFERENCE_GRADIENT)) continue
      const actual = gradient(r, polar)
      expect(Math.abs(actual.rho - reference.rho) / scale).toBeLessThan(1e-5)
      expect(Math.abs(actual.height - reference.height) / scale).toBeLessThan(
        1e-5,
      )
      checked += 1
    }
    expect(checked).toBeGreaterThan(POINTS * 0.8)
  })

  it('scales as 1/length with the Bohr radius', () => {
    const orbital = { n: 3, l: 1, m: 1 }
    const atomic = logAmplitudeGradient(orbital)
    const bohrRadius = 0.07
    const world = logAmplitudeGradient(orbital, { bohrRadius })
    for (const { r, polar } of randomPoints(7, 30)) {
      const expected = atomic(r, polar)
      const actual = world(r * bohrRadius, polar)
      expect(actual.rho * bohrRadius).toBeCloseTo(expected.rho, 8)
      expect(actual.height * bohrRadius).toBeCloseTo(expected.height, 8)
    }
  })

  describe('with softening', () => {
    const softening = 0.02
    const maxSoftenedInverse = 1 / (2 * Math.sqrt(softening))

    it('stays bounded at a radial node (2s, r = 2)', () => {
      const gradient = logAmplitudeGradient({ n: 2, l: 0, m: 0 }, { softening })
      for (const r of [1.999, 2, 2.001]) {
        const { rho } = gradient(r, Math.PI / 2)
        expect(Math.abs(rho)).toBeLessThan(maxSoftenedInverse + 1)
      }
    })

    it('stays bounded on an angular node (2p0, polar = π/2) and on the axis', () => {
      const gradient = logAmplitudeGradient({ n: 2, l: 1, m: 0 }, { softening })
      expect(Number.isFinite(gradient(3, Math.PI / 2).height)).toBe(true)
      const onAxis = logAmplitudeGradient({ n: 2, l: 1, m: 1 }, { softening })(
        3,
        0,
      )
      expect(onAxis.rho).toBe(0)
    })

    it('leaves the gradient nearly unchanged far from any node', () => {
      const orbital = { n: 3, l: 2, m: 1 }
      const exact = logAmplitudeGradient(orbital)(8, 1)
      const softened = logAmplitudeGradient(orbital, { softening: 1e-4 })(8, 1)
      expect(softened.rho).toBeCloseTo(exact.rho, 3)
      expect(softened.height).toBeCloseTo(exact.height, 3)
    })
  })
})
