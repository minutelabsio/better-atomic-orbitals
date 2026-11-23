import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import { logAmplitudeGradient } from './logAmplitudeGradient.js'
import type { QuantumNumbers } from './quantumNumbers.js'
import {
  axialSpinCurrentOmega,
  SPIN_DOWN,
  SPIN_UP,
  spinCurrentVelocity,
} from './spinCurrent.js'
import { probabilityCurrentOmega } from './velocity.js'

const POINTS = 300
const NODE_MARGIN = 0.05

interface Point {
  r: number
  polar: number
  rho: number
}

/** Total ω (orbital + spin term), exact: atomic units, no softening. */
function totalOmega(
  orbital: QuantumNumbers,
  spin: number,
  { r, polar, rho }: Point,
) {
  const gradient = logAmplitudeGradient(orbital)(r, polar)
  return (
    probabilityCurrentOmega(rho, orbital.m, 0) +
    axialSpinCurrentOmega(gradient, rho, spin)
  )
}

function* randomPoints(seed: number, isAwayFromNodes: (p: Point) => boolean) {
  const rng = seededRng(seed)
  let emitted = 0
  while (emitted < POINTS) {
    const r = 0.05 + rng() * 15
    const polar = 0.02 + rng() * (Math.PI - 0.04)
    const point = { r, polar, rho: r * Math.sin(polar) }
    if (isAwayFromNodes(point)) {
      emitted += 1
      yield point
    }
  }
}

const anywhere = () => true
const awayFromSphere =
  (nodeRadius: number) =>
  ({ r }: Point) =>
    Math.abs(r - nodeRadius) > NODE_MARGIN
const awayFromEquator = ({ polar }: Point) =>
  Math.abs(Math.cos(polar)) > NODE_MARGIN

interface ClosedForm {
  name: string
  orbital: QuantumNumbers
  spin: number
  isAwayFromNodes: (p: Point) => boolean
  omega: (p: Point) => number
}

const CLOSED_FORMS: ClosedForm[] = [
  {
    name: '1s up: 1/r',
    orbital: { n: 1, l: 0, m: 0 },
    spin: SPIN_UP,
    isAwayFromNodes: anywhere,
    omega: ({ r }) => 1 / r,
  },
  {
    name: '1s down: -1/r',
    orbital: { n: 1, l: 0, m: 0 },
    spin: SPIN_DOWN,
    isAwayFromNodes: anywhere,
    omega: ({ r }) => -1 / r,
  },
  {
    name: '2s up: (1/(2r))(1/(1 - r/2) + 1)',
    orbital: { n: 2, l: 0, m: 0 },
    spin: SPIN_UP,
    isAwayFromNodes: awayFromSphere(2),
    omega: ({ r }) => (1 / (2 * r)) * (1 / (1 - r / 2) + 1),
  },
  {
    name: '2p0 up: 1/(2r)',
    orbital: { n: 2, l: 1, m: 0 },
    spin: SPIN_UP,
    isAwayFromNodes: awayFromEquator,
    omega: ({ r }) => 1 / (2 * r),
  },
  {
    name: '2p(+1) up: 1/(2r), orbital term cancelled',
    orbital: { n: 2, l: 1, m: 1 },
    spin: SPIN_UP,
    isAwayFromNodes: anywhere,
    omega: ({ r }) => 1 / (2 * r),
  },
  {
    name: '2p(-1) up: -2/rho^2 + 1/(2r)',
    orbital: { n: 2, l: 1, m: -1 },
    spin: SPIN_UP,
    isAwayFromNodes: anywhere,
    omega: ({ r, rho }) => -2 / (rho * rho) + 1 / (2 * r),
  },
  {
    name: '2p(-1) down: -1/(2r)',
    orbital: { n: 2, l: 1, m: -1 },
    spin: SPIN_DOWN,
    isAwayFromNodes: anywhere,
    omega: ({ r }) => -1 / (2 * r),
  },
]

describe('axialSpinCurrentOmega (+ the orbital term m/rho^2)', () => {
  it.each(CLOSED_FORMS)('$name', ({
    orbital,
    spin,
    isAwayFromNodes,
    omega,
  }) => {
    for (const point of randomPoints(
      orbital.n * 7 + orbital.m + spin,
      isAwayFromNodes,
    )) {
      const expected = omega(point)
      const actual = totalOmega(orbital, spin, point)
      expect(Math.abs(actual - expected)).toBeLessThan(
        1e-9 * Math.max(1, Math.abs(expected)),
      )
    }
  })

  it('spin down flips the sign of the spin term only', () => {
    const orbital = { n: 3, l: 2, m: 1 }
    const gradientAt = logAmplitudeGradient(orbital)
    for (const { r, polar, rho } of randomPoints(3, anywhere)) {
      const gradient = gradientAt(r, polar)
      expect(axialSpinCurrentOmega(gradient, rho, SPIN_DOWN)).toBe(
        -axialSpinCurrentOmega(gradient, rho, SPIN_UP),
      )
    }
  })

  it('is zero on the axis, where a point cannot move', () => {
    expect(axialSpinCurrentOmega({ rho: 0, height: 1 }, 0, SPIN_UP)).toBe(0)
  })
})

describe('spinCurrentVelocity', () => {
  it('is perpendicular to both the gradient and the spin', () => {
    const rng = seededRng(11)
    const vector = () => [rng() - 0.5, rng() - 0.5, rng() - 0.5] as const
    const dot = (a: readonly number[], b: readonly number[]) =>
      a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!
    for (let i = 0; i < 50; i += 1) {
      const gradient = vector()
      const spin = vector()
      const velocity = spinCurrentVelocity(gradient, spin)
      expect(dot(velocity, gradient)).toBeCloseTo(0, 12)
      expect(dot(velocity, spin)).toBeCloseTo(0, 12)
    }
  })

  it('points along -phi for an outward gradient and spin up the axis', () => {
    expect(spinCurrentVelocity([1, 0, 0], [0, 0, 1])).toEqual([0, -1, 0])
  })
})
