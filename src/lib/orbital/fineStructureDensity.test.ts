import { describe, expect, it } from 'vitest'
import { fineStructureAngularDensity } from './fineStructureDensity.js'

const POLARS = [0, 0.2, 0.9, Math.PI / 2, 2.1, 3]

describe('fineStructureAngularDensity', () => {
  it('is spherically symmetric for every j = ½ state (1/(4π) · sin θ)', () => {
    for (const l of [0, 1]) {
      for (const mj of [-0.5, 0.5]) {
        const density = fineStructureAngularDensity({ l, j: 0.5, mj })
        for (const polar of POLARS) {
          expect(density(polar)).toBeCloseTo(
            Math.sin(polar) / (4 * Math.PI),
            14,
          )
        }
      }
    }
  })

  it('is not spherical for j = 3/2, m_j = ½: 2p3/2 bulges along the axis', () => {
    const density = fineStructureAngularDensity({ l: 1, j: 1.5, mj: 0.5 })
    const perSolidAngle = (polar: number) => density(polar) / Math.sin(polar)
    // (4cos²θ + sin²θ) / (8π)
    expect(perSolidAngle(0.3)).toBeCloseTo(
      (4 * Math.cos(0.3) ** 2 + Math.sin(0.3) ** 2) / (8 * Math.PI),
      14,
    )
    expect(perSolidAngle(0.01)).toBeGreaterThan(perSolidAngle(Math.PI / 2))
  })
})
