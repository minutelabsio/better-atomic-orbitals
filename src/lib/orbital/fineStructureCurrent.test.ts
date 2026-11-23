import { describe, expect, it } from 'vitest'
import { bruteForcePauliVelocity } from './__fixtures__/bruteForcePauliCurrent.js'
import { seededRng } from './__fixtures__/seededRng.js'
import { spinorComponents } from './clebschGordan.js'
import type { FineStructureNumbers } from './fineStructure.js'
import { fineStructureOmega } from './fineStructureCurrent.js'
import { logAmplitudeGradient } from './logAmplitudeGradient.js'
import { axialSpinCurrentOmega, SPIN_DOWN, SPIN_UP } from './spinCurrent.js'
import { probabilityCurrentOmega } from './velocity.js'

const POINTS = 200
const NODE_MARGIN = 0.05

interface Point {
  r: number
  polar: number
  azimuth: number
}

function* randomPoints(seed: number, isAwayFromNodes: (p: Point) => boolean) {
  const rng = seededRng(seed)
  let emitted = 0
  while (emitted < POINTS) {
    const point = {
      r: 0.1 + rng() * 12,
      polar: 0.05 + rng() * (Math.PI - 0.1),
      azimuth: rng() * 2 * Math.PI,
    }
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

const state = (n: number, l: number, j: number, mj: number) => ({
  n,
  l,
  j,
  mj,
})

interface TableEntry {
  state: FineStructureNumbers
  isAwayFromNodes: (p: Point) => boolean
  /** ω for m_j > 0; the m_j < 0 state circulates the other way */
  omega: (p: Point) => number
}

/** Colijn & Vrscay, arXiv quant-ph/0304198, Table 1 (atomic units). */
const TABLE_1: TableEntry[] = [
  {
    state: state(1, 0, 0.5, 0.5),
    isAwayFromNodes: anywhere,
    omega: ({ r }) => 1 / r,
  },
  {
    state: state(2, 0, 0.5, 0.5),
    isAwayFromNodes: awayFromSphere(2),
    omega: ({ r }) => (1 / (2 * r)) * (1 / (1 - r / 2) + 1),
  },
  {
    state: state(2, 1, 1.5, 1.5),
    isAwayFromNodes: anywhere,
    omega: ({ r }) => 1 / (2 * r),
  },
  {
    state: state(2, 1, 0.5, 0.5),
    isAwayFromNodes: anywhere,
    omega: ({ r }) => (1 / (r * r)) * (3 - r / 2),
  },
  {
    state: state(2, 1, 1.5, 0.5),
    isAwayFromNodes: anywhere,
    omega: ({ r, polar }) => {
      const cos2 = Math.cos(polar) ** 2
      const sin2 = Math.sin(polar) ** 2
      return (1 / (2 * r)) * ((8 * cos2 - sin2) / (4 * cos2 + sin2))
    },
  },
]

const label = ({ n, l, j, mj }: FineStructureNumbers) =>
  `n=${n} l=${l} j=${j} mj=${mj}`

const mirrored = (s: FineStructureNumbers) => ({ ...s, mj: -s.mj })

/** ω and the off-azimuthal speed from the brute-force current, at p. */
function bruteForce(s: FineStructureNumbers, { r, polar, azimuth }: Point) {
  const { up, down } = spinorComponents(s)
  const rho = r * Math.sin(polar)
  const p = [
    rho * Math.cos(azimuth),
    rho * Math.sin(azimuth),
    r * Math.cos(polar),
  ] as const
  const [vx, vy, vz] = bruteForcePauliVelocity(s.n, s.l, up, down, p)
  const alongPhi = -Math.sin(azimuth) * vx + Math.cos(azimuth) * vy
  const alongRho = Math.cos(azimuth) * vx + Math.sin(azimuth) * vy
  return { omega: alongPhi / rho, meridionalSpeed: Math.hypot(alongRho, vz) }
}

const relativeError = (actual: number, expected: number) =>
  Math.abs(actual - expected) / Math.max(1, Math.abs(expected))

describe('fineStructureOmega', () => {
  describe('matches Colijn & Vrscay Table 1 (exact, atomic units)', () => {
    for (const { state: s, isAwayFromNodes, omega } of TABLE_1) {
      it(label(s), () => {
        const omegaAt = fineStructureOmega(s)
        const mirroredOmegaAt = fineStructureOmega(mirrored(s))
        for (const p of randomPoints(11, isAwayFromNodes)) {
          expect(relativeError(omegaAt(p.r, p.polar), omega(p))).toBeLessThan(
            1e-9,
          )
          expect(
            relativeError(mirroredOmegaAt(p.r, p.polar), -omega(p)),
          ).toBeLessThan(1e-9)
        }
      })
    }
  })

  describe('matches a brute-force Pauli current from the two spinor components', () => {
    const states = [
      ...TABLE_1.map((entry) => entry.state),
      state(2, 1, 1.5, -0.5),
      state(2, 1, 0.5, -0.5),
      state(3, 0, 0.5, 0.5),
      state(3, 1, 0.5, -0.5),
      state(3, 1, 1.5, 0.5),
      state(3, 2, 1.5, 1.5),
      state(3, 2, 1.5, 0.5),
      state(3, 2, 1.5, -0.5),
      state(3, 2, 2.5, 2.5),
      state(3, 2, 2.5, 1.5),
      state(3, 2, 2.5, 0.5),
      state(3, 2, 2.5, -1.5),
    ]
    const radialNodes: Record<string, number[]> = {
      '2,0': [2],
      '3,0': [(9 - 3 * Math.sqrt(3)) / 2, (9 + 3 * Math.sqrt(3)) / 2],
      '3,1': [6],
    }
    for (const s of states) {
      it(`${label(s)}: same ω, and no flow off the azimuth`, () => {
        const nodes = radialNodes[`${s.n},${s.l}`] ?? []
        const isAwayFromNodes = (p: Point) =>
          nodes.every((node) => awayFromSphere(node)(p)) &&
          // keep clear of the cones where a d component vanishes
          Math.abs(Math.cos(p.polar)) > NODE_MARGIN &&
          Math.abs(3 * Math.cos(p.polar) ** 2 - 1) > NODE_MARGIN
        const omegaAt = fineStructureOmega(s)
        for (const p of randomPoints(23, isAwayFromNodes)) {
          const reference = bruteForce(s, p)
          expect(
            relativeError(omegaAt(p.r, p.polar), reference.omega),
          ).toBeLessThan(1e-5)
          expect(reference.meridionalSpeed).toBeLessThan(1e-5)
        }
      })
    }
  })

  it('in a stretched state is the spin-current module’s orbital + spin term, softened too', () => {
    const softening = 0.02
    for (const l of [0, 1, 2]) {
      for (const [mj, m, spin] of [
        [l + 0.5, l, SPIN_UP],
        [-(l + 0.5), -l, SPIN_DOWN],
      ] as const) {
        const s = state(3, l, l + 0.5, mj)
        const omegaAt = fineStructureOmega(s, { softening, bohrRadius: 0.3 })
        const gradientAt = logAmplitudeGradient(
          { n: 3, l, m },
          { softening, bohrRadius: 0.3 },
        )
        for (const { r, polar } of randomPoints(31, anywhere)) {
          const rho = r * Math.sin(polar)
          const expected =
            probabilityCurrentOmega(rho, m, softening) +
            axialSpinCurrentOmega(gradientAt(r, polar), rho, spin)
          expect(omegaAt(r, polar)).toBe(expected)
        }
      }
    }
  })

  it('stays finite everywhere when softened, nodes and axis included', () => {
    const softening = 0.02
    for (const s of [
      state(2, 0, 0.5, 0.5),
      state(2, 1, 0.5, -0.5),
      state(3, 2, 1.5, 0.5),
      state(3, 2, 2.5, -1.5),
    ]) {
      const omegaAt = fineStructureOmega(s, { softening })
      for (const r of [0, 0.5, 2, 6]) {
        for (const polar of [0, Math.acos(1 / Math.sqrt(3)), Math.PI / 2]) {
          expect(Number.isFinite(omegaAt(r, polar))).toBe(true)
        }
      }
    }
  })
})
