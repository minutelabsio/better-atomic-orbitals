import { describe, expect, it } from 'vitest'
import { spinDirection } from './spinDirection.js'

const POLARS = [0.05, 0.4, 0.9, 1.4, Math.PI / 2, 2.1, 2.9]

describe('spinDirection', () => {
  it('is a unit vector in the meridional plane', () => {
    for (const state of [
      { l: 1, j: 0.5, mj: 0.5 },
      { l: 1, j: 1.5, mj: -0.5 },
      { l: 2, j: 2.5, mj: 1.5 },
      { l: 2, j: 1.5, mj: -0.5 },
    ]) {
      const at = spinDirection(state)
      for (const polar of POLARS) {
        const { rho, axial } = at(polar)
        expect(Math.hypot(rho, axial)).toBeCloseTo(1, 12)
      }
    }
  })

  it('is fixed along the axis for stretched states', () => {
    for (const l of [0, 1, 2]) {
      const up = spinDirection({ l, j: l + 0.5, mj: l + 0.5 })
      const down = spinDirection({ l, j: l + 0.5, mj: -l - 0.5 })
      for (const polar of POLARS) {
        expect(up(polar).axial).toBe(1)
        expect(down(polar).axial).toBe(-1)
        expect(Math.abs(up(polar).rho) + Math.abs(down(polar).rho)).toBe(0)
      }
    }
  })

  it('in 2p1/2 m_j = ½ tilts by twice the polar angle', () => {
    // ψ ∝ -cos θ ↑ - sin θ e^(iφ) ↓, so s = (sin 2θ, cos 2θ)
    const at = spinDirection({ l: 1, j: 0.5, mj: 0.5 })
    for (const polar of POLARS) {
      const { rho, axial } = at(polar)
      expect(rho).toBeCloseTo(Math.sin(2 * polar), 12)
      expect(axial).toBeCloseTo(Math.cos(2 * polar), 12)
    }
  })
})
