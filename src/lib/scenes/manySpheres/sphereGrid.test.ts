import { describe, expect, it } from 'vitest'
import { measuredSpin } from '../../orbital/measuredSpin.js'
import { orbitalShape } from '../../orbital/orbitalShape.js'
import { createSphereGrid } from './sphereGrid.js'
import { SPIN_SEPARATION_DISTANCE } from './spinSeparation.js'

const COUNT = 400
const STRIDE = 4

/** Each sphere's written y, for one frame at the given separation. */
function sphereHeights(
  grid: ReturnType<typeof createSphereGrid>,
  separation: number,
) {
  grid.update({
    speedScale: 0,
    sphereRadius: 0.01,
    spinField: 'measured',
    separation,
  })
  return Array.from(
    { length: COUNT },
    (_, i) => grid.spheres.data[i * STRIDE + 1]!,
  )
}

describe('sphereGrid separate-by-spin', () => {
  it('moves measured spin-up spheres toward world +Y and spin-down toward -Y', () => {
    const grid = createSphereGrid({ count: COUNT, gridRes: 8 })
    const shape = orbitalShape({ n: 2, l: 1, j: 0.5, mj: 0.5 }, grid.uniforms)
    grid.setOrbitalState({ shape, m: 0, spin: 0 })
    const spins = measuredSpin(shape, grid.uniforms.uSpin)
    expect(spins.includes(1) && spins.includes(-1)).toBe(true)

    const together = sphereHeights(grid, 0)
    const apart = sphereHeights(grid, 1)
    spins.forEach((spin, i) => {
      expect(apart[i]! - together[i]!).toBeCloseTo(
        spin * SPIN_SEPARATION_DISTANCE,
        5,
      )
    })
    grid.dispose()
  })
})
