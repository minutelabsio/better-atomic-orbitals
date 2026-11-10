import { isInCutQuadrant } from './cutaway.js'
import { clampedCellIndex, type GridGeometry } from './gridGeometry.js'
import {
  type PackedFloatTexture,
  packedFloatTexture,
} from './packedFloatTexture.js'

const SPHERE_STRIDE = 4 // xyz centre + radius per sphere
const CELL_RANGE_STRIDE = 4 // r = offset into index list, g = count
const COVERAGE_STRIDE = 6 // x0, x1, y0, y1, z0, z1 (inclusive) per sphere

export interface GridBuilderOptions {
  geometry: GridGeometry
  sphereCount: number
  /** index-list capacity as a multiple of sphereCount (covers spheres straddling cells) */
  capacityFactor?: number
}

export interface GridBuildOptions {
  /** leave spheres in the cut quadrant out of the grid, so rays cross the opening cheaply */
  cutaway: boolean
}

export interface GridBuilder {
  /** per cell: offset into the index list, and how many entries it has */
  readonly cellRange: PackedFloatTexture
  /** sphere indices grouped by cell */
  readonly indexList: PackedFloatTexture
  /** rebuild from `spheres` (xyz + radius per sphere) */
  build(spheres: Float32Array, options: GridBuildOptions): void
  dispose(): void
}

/** Everything one build reads and writes. */
interface GridBuffers {
  readonly geometry: GridGeometry
  readonly sphereCount: number
  readonly indexCapacity: number
  /** per sphere: the cell range its bounding box covers; empty if left out */
  readonly coverage: Uint16Array
  /** per-cell sphere count, then reused as each cell's write cursor */
  readonly cellCursor: Int32Array
  readonly cellRange: Float32Array
  readonly indexList: Float32Array
}

/**
 * Builds a single-level uniform grid over the spheres by counting sort — O(N),
 * cheap enough to redo every frame — into textures a fragment shader can
 * traverse. A sphere goes in every cell its bounding box touches.
 */
export function createGridBuilder({
  geometry,
  sphereCount,
  capacityFactor = 4,
}: GridBuilderOptions): GridBuilder {
  const indexCapacity = sphereCount * capacityFactor
  const cellRange = packedFloatTexture(geometry.cellCount, 4)
  const indexList = packedFloatTexture(indexCapacity, 1)
  const buffers: GridBuffers = {
    geometry,
    sphereCount,
    indexCapacity,
    coverage: new Uint16Array(sphereCount * COVERAGE_STRIDE),
    cellCursor: new Int32Array(geometry.cellCount),
    cellRange: cellRange.data,
    indexList: indexList.data,
  }

  return {
    cellRange,
    indexList,
    build(spheres, { cutaway }) {
      writeCoverage(buffers, spheres, cutaway)
      countSpheresPerCell(buffers)
      writeCellRanges(buffers)
      scatterSphereIndices(buffers)
      cellRange.texture.needsUpdate = true
      indexList.texture.needsUpdate = true
    },
    dispose() {
      cellRange.texture.dispose()
      indexList.texture.dispose()
    },
  }
}

// Per-frame hot loops: module-level functions over explicit buffers rather
// than closures, which measured slower once a second instance existed (e.g.
// after a remount).

function writeCoverage(
  { geometry, sphereCount, coverage }: GridBuffers,
  spheres: Float32Array,
  cutaway: boolean,
): void {
  const { boundMin, cellSize } = geometry
  const last = geometry.gridRes - 1
  for (let sphere = 0; sphere < sphereCount; sphere += 1) {
    const s = sphere * SPHERE_STRIDE
    const c = sphere * COVERAGE_STRIDE
    const x = spheres[s]!
    const y = spheres[s + 1]!
    const z = spheres[s + 2]!
    const r = spheres[s + 3]!
    if (cutaway && isInCutQuadrant(y, z)) {
      coverage.fill(0, c, c + COVERAGE_STRIDE)
      coverage[c] = 1 // x0 > x1: an empty range
      continue
    }
    coverage[c] = clampedCellIndex(x - r, boundMin, cellSize, last)
    coverage[c + 1] = clampedCellIndex(x + r, boundMin, cellSize, last)
    coverage[c + 2] = clampedCellIndex(y - r, boundMin, cellSize, last)
    coverage[c + 3] = clampedCellIndex(y + r, boundMin, cellSize, last)
    coverage[c + 4] = clampedCellIndex(z - r, boundMin, cellSize, last)
    coverage[c + 5] = clampedCellIndex(z + r, boundMin, cellSize, last)
  }
}

function countSpheresPerCell({
  geometry,
  sphereCount,
  coverage,
  cellCursor,
}: GridBuffers): void {
  const { gridRes } = geometry
  cellCursor.fill(0)
  for (let sphere = 0; sphere < sphereCount; sphere += 1) {
    const c = sphere * COVERAGE_STRIDE
    for (let cz = coverage[c + 4]!; cz <= coverage[c + 5]!; cz += 1) {
      for (let cy = coverage[c + 2]!; cy <= coverage[c + 3]!; cy += 1) {
        const row = (cz * gridRes + cy) * gridRes
        for (let cx = coverage[c]!; cx <= coverage[c + 1]!; cx += 1) {
          cellCursor[row + cx]! += 1
        }
      }
    }
  }
}

/** Prefix-sum the counts into each cell's offset, leaving cursors at those offsets. */
function writeCellRanges({
  geometry,
  cellCursor,
  cellRange,
}: GridBuffers): void {
  let offset = 0
  for (let cell = 0; cell < geometry.cellCount; cell += 1) {
    const count = cellCursor[cell]!
    cellRange[cell * CELL_RANGE_STRIDE] = offset
    cellRange[cell * CELL_RANGE_STRIDE + 1] = count
    cellCursor[cell] = offset
    offset += count
  }
}

function scatterSphereIndices({
  geometry,
  sphereCount,
  indexCapacity,
  coverage,
  cellCursor,
  indexList,
}: GridBuffers): void {
  const { gridRes } = geometry
  for (let sphere = 0; sphere < sphereCount; sphere += 1) {
    const c = sphere * COVERAGE_STRIDE
    for (let cz = coverage[c + 4]!; cz <= coverage[c + 5]!; cz += 1) {
      for (let cy = coverage[c + 2]!; cy <= coverage[c + 3]!; cy += 1) {
        const row = (cz * gridRes + cy) * gridRes
        for (let cx = coverage[c]!; cx <= coverage[c + 1]!; cx += 1) {
          const slot = cellCursor[row + cx]!
          if (slot < indexCapacity) {
            indexList[slot] = sphere
            cellCursor[row + cx] = slot + 1
          }
        }
      }
    }
  }
}
