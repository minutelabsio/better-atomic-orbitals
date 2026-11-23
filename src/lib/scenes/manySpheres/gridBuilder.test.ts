import { describe, expect, it } from 'vitest'
import { seededRng } from '../../orbital/__fixtures__/seededRng.js'
import { isInCutQuadrant } from './cutaway.js'
import { createGridBuilder } from './gridBuilder.js'
import {
  clampedCellIndex,
  type GridExtent,
  gridExtent,
  gridGeometry,
} from './gridGeometry.js'

const SPHERE_COUNT = 300
const geometry = gridGeometry({ gridRes: 8, boundRadius: 1 })

function randomSpheres(rng: () => number): Float32Array {
  const spheres = new Float32Array(SPHERE_COUNT * 4)
  for (let i = 0; i < SPHERE_COUNT; i += 1) {
    spheres.set(
      [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1, 0.02 + rng() * 0.2],
      i * 4,
    )
  }
  return spheres
}

/** Every cell's sphere list, the slow obvious way. */
function bruteForceCellLists(
  spheres: Float32Array,
  cutaway: boolean,
  { boundMin, cellSize }: GridExtent = geometry,
): number[][] {
  const lists: number[][] = Array.from({ length: geometry.cellCount }, () => [])
  for (let i = 0; i < SPHERE_COUNT; i += 1) {
    const [x, y, z, r] = spheres.subarray(i * 4, i * 4 + 4)
    if (cutaway && isInCutQuadrant(y!, z!)) continue
    const cell = (coordinate: number) =>
      clampedCellIndex(coordinate, boundMin, cellSize, geometry.gridRes - 1)
    for (let cz = cell(z! - r!); cz <= cell(z! + r!); cz += 1)
      for (let cy = cell(y! - r!); cy <= cell(y! + r!); cy += 1)
        for (let cx = cell(x! - r!); cx <= cell(x! + r!); cx += 1)
          lists[(cz * geometry.gridRes + cy) * geometry.gridRes + cx]!.push(i)
  }
  return lists
}

function builtCellLists(
  builder: ReturnType<typeof createGridBuilder>,
): number[][] {
  return Array.from({ length: geometry.cellCount }, (_, cell) => {
    const offset = builder.cellRange.data[cell * 4]!
    const count = builder.cellRange.data[cell * 4 + 1]!
    return Array.from(builder.indexList.data.subarray(offset, offset + count))
  })
}

describe('createGridBuilder', () => {
  // big spheres touch up to 27 cells each, so leave room for all of them
  const builder = createGridBuilder({
    geometry,
    sphereCount: SPHERE_COUNT,
    capacityFactor: 27,
  })
  const spheres = randomSpheres(seededRng(7))

  it('lists every sphere in every cell its bounding box touches', () => {
    builder.build(spheres, { cutaway: false })
    expect(builtCellLists(builder)).toEqual(bruteForceCellLists(spheres, false))
  })

  it('leaves the cut quadrant out, and rebuilds cleanly', () => {
    builder.build(spheres, { cutaway: true })
    expect(builtCellLists(builder)).toEqual(bruteForceCellLists(spheres, true))
  })

  it('can place the same cells over a larger extent for one build', () => {
    const wider = gridExtent(geometry.gridRes, 2)
    builder.build(spheres, { cutaway: false, extent: wider })
    expect(builtCellLists(builder)).toEqual(
      bruteForceCellLists(spheres, false, wider),
    )
  })
})
