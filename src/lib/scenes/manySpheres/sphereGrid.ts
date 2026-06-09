import * as THREE from 'three'

export interface SphereGridOptions {
  count: number
  clusterRadius?: number
  sphereRadius?: number
  rotationSpeed?: number
  speedEpsilon?: number
  xzGap?: number
  /** number of grid cells per axis */
  gridRes?: number
  /** half-extent of the (cubic) grid domain; must comfortably contain the cluster */
  boundRadius?: number
  /** index-list capacity as a multiple of count (covers AABB straddle) */
  capacityFactor?: number
}

/** ceil(sqrt) packing into a 2D texture; width chosen so width*height >= n */
function texDims(n: number): { w: number; h: number } {
  const w = Math.ceil(Math.sqrt(n))
  const h = Math.ceil(n / w)
  return { w, h }
}

function makeFloatTexture(
  w: number,
  h: number,
  channels: 1 | 4,
): THREE.DataTexture {
  const format = channels === 1 ? THREE.RedFormat : THREE.RGBAFormat
  const data = new Float32Array(w * h * channels)
  const tex = new THREE.DataTexture(data, w, h, format, THREE.FloatType)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

/**
 * Maintains a population of slowly-orbiting spheres (orbital scheme from
 * TinySpheres.svelte) and rebuilds a single-level uniform grid every frame via
 * counting sort, packing the result into three float DataTextures for a
 * fragment-shader ray tracer to traverse:
 *   - spherePos  RGBA32F : xyz = centre, w = radius      (one texel per sphere)
 *   - cellRange  RGBA32F : r = offset into index list, g = count  (one per cell)
 *   - indexList  R32F    : sphere indices grouped by cell
 */
export class SphereGrid {
  readonly count: number
  readonly sphereRadius: number
  readonly gridRes: number
  readonly numCells: number
  readonly boundMin: number
  readonly boundSize: number
  readonly cellSize: number

  readonly spherePosTex: THREE.DataTexture
  readonly cellRangeTex: THREE.DataTexture
  readonly indexListTex: THREE.DataTexture
  readonly spherePosTexW: number
  readonly cellRangeTexW: number
  readonly indexListTexW: number
  readonly indexCapacity: number

  private readonly theta: Float32Array
  private readonly radii: Float32Array
  private readonly yPos: Float32Array
  private readonly speed: Float32Array
  /** stable per-sphere uniform random in [-1, 1] for size variation */
  private readonly radiusRand: Float32Array

  private readonly spherePosData: Float32Array
  private readonly cellRangeData: Float32Array
  private readonly indexListData: Float32Array
  private readonly counts: Int32Array

  constructor(opts: SphereGridOptions) {
    const {
      count,
      clusterRadius = 1.4,
      sphereRadius = 0.012,
      rotationSpeed = -0.001,
      speedEpsilon = 0.1,
      xzGap = 0.08,
      gridRes = 32,
      // generous fixed margin so live radius changes stay within the domain
      boundRadius = clusterRadius + 0.1,
      capacityFactor = 4,
    } = opts

    this.count = count
    this.sphereRadius = sphereRadius
    this.gridRes = gridRes
    this.numCells = gridRes * gridRes * gridRes
    this.boundMin = -boundRadius
    this.boundSize = 2 * boundRadius
    this.cellSize = this.boundSize / gridRes

    this.theta = new Float32Array(count)
    this.radii = new Float32Array(count)
    this.yPos = new Float32Array(count)
    this.speed = new Float32Array(count)
    this.radiusRand = new Float32Array(count)

    // --- seed orbital parameters (mirrors TinySpheres.svelte) ---
    const v = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      do {
        v.set(
          THREE.MathUtils.randFloatSpread(2),
          THREE.MathUtils.randFloatSpread(2),
          THREE.MathUtils.randFloatSpread(2),
        )
        if (v.lengthSq() === 0) v.set(1, 0, 0)
        v.normalize().multiplyScalar(clusterRadius * Math.cbrt(Math.random()))
      } while (Math.abs(v.y) < xzGap)

      const r = Math.sqrt(v.x * v.x + v.z * v.z)
      this.radii[i] = r
      this.yPos[i] = v.y
      this.theta[i] = Math.atan2(v.z, v.x)
      this.speed[i] = rotationSpeed / (r + speedEpsilon) ** 2
      this.radiusRand[i] = Math.random() * 2 - 1 // uniform [-1, 1]
    }

    // --- allocate textures ---
    const sp = texDims(count)
    this.spherePosTexW = sp.w
    this.spherePosTex = makeFloatTexture(sp.w, sp.h, 4)
    this.spherePosData = this.spherePosTex.image.data as Float32Array

    const cr = texDims(this.numCells)
    this.cellRangeTexW = cr.w
    this.cellRangeTex = makeFloatTexture(cr.w, cr.h, 4)
    this.cellRangeData = this.cellRangeTex.image.data as Float32Array

    this.indexCapacity = count * capacityFactor
    const il = texDims(this.indexCapacity)
    this.indexListTexW = il.w
    this.indexListTex = makeFloatTexture(il.w, il.h, 1)
    this.indexListData = this.indexListTex.image.data as Float32Array

    this.counts = new Int32Array(this.numCells)

    this.update() // initial build so first frame has data
  }

  /**
   * Advance orbits one step and rebuild the grid.
   * @param cutaway when true, spheres in the top-front quarter (y>0 && z>0) are
   *   excluded from the grid entirely — empty cells there, so rays traverse the
   *   opening cheaply instead of marching through full-but-skipped cells.
   * @param sphereRadius base radius of each sphere.
   * @param radiusVariation fraction (0..1); each sphere's radius is scaled by
   *   1 + radiusVariation * rand, where rand is its stable uniform [-1, 1].
   * @param cutawayFeather world-space band width over which spheres shrink to
   *   zero as they approach the cut quadrant (so they fade by size instead of
   *   popping in/out). 0 = hard edge (original behaviour).
   */
  update(
    cutaway = false,
    sphereRadius = this.sphereRadius,
    radiusVariation = 0,
    cutawayFeather = 0,
  ): void {
    const { count, gridRes, cellSize, boundMin, indexCapacity } = this
    const { theta, radii, yPos, speed } = this
    // explicit member reads (biome's unused-private check misses destructure reads)
    const radiusRand = this.radiusRand
    const spherePosData = this.spherePosData
    const cellRangeData = this.cellRangeData
    const indexListData = this.indexListData
    const counts = this.counts
    const last = gridRes - 1

    counts.fill(0)

    // Pass 1: advance positions, write spherePos, count cell occupancy.
    for (let i = 0; i < count; i++) {
      const th = theta[i]! + speed[i]!
      theta[i] = th
      const r = radii[i]!
      const x = r * Math.cos(th)
      const y = yPos[i]!
      const z = r * Math.sin(th)

      let rr = sphereRadius * (1 + radiusVariation * radiusRand[i]!)
      // cutaway feather: scale radius by a smoothstep of the distance to the cut
      // quadrant (y>0 && z>0), so a sphere shrinks to nothing as it enters the
      // cut and grows back as it leaves, instead of popping. distToCut is 0
      // inside the quadrant and length(max(-y,0), max(-z,0)) outside it.
      if (cutaway && cutawayFeather > 0) {
        const oy = y < 0 ? -y : 0
        const oz = z < 0 ? -z : 0
        const distToCut = Math.sqrt(oy * oy + oz * oz)
        const t = distToCut >= cutawayFeather ? 1 : distToCut / cutawayFeather
        rr *= t * t * (3 - 2 * t)
      }
      const o = i * 4
      spherePosData[o] = x
      spherePosData[o + 1] = y
      spherePosData[o + 2] = z
      spherePosData[o + 3] = rr

      // cutaway: don't insert this sphere into the grid at all (still advanced
      // above, since its position is needed to test the cut region)
      if (cutaway && y > 0 && z > 0) continue

      // cell range covered by the sphere AABB (border-correct insertion)
      const x0 = clampCell((x - rr - boundMin) / cellSize, last)
      const x1 = clampCell((x + rr - boundMin) / cellSize, last)
      const y0 = clampCell((y - rr - boundMin) / cellSize, last)
      const y1 = clampCell((y + rr - boundMin) / cellSize, last)
      const z0 = clampCell((z - rr - boundMin) / cellSize, last)
      const z1 = clampCell((z + rr - boundMin) / cellSize, last)
      for (let cz = z0; cz <= z1; cz++) {
        for (let cy = y0; cy <= y1; cy++) {
          const base = (cz * gridRes + cy) * gridRes
          for (let cx = x0; cx <= x1; cx++) counts[base + cx]!++
        }
      }
    }

    // Prefix sum -> cell offsets; write cellRange texture (offset, count).
    // `counts` is then repurposed as the per-cell write cursor for pass 2.
    let acc = 0
    for (let c = 0; c < this.numCells; c++) {
      const cnt = counts[c]!
      const o = c * 4
      cellRangeData[o] = acc
      cellRangeData[o + 1] = cnt
      counts[c] = acc // start offset; incremented as indices are scattered
      acc += cnt
    }

    // Pass 2: scatter sphere indices into the index list (recompute AABB cells).
    for (let i = 0; i < count; i++) {
      const o = i * 4
      const x = spherePosData[o]!
      const y = spherePosData[o + 1]!
      const z = spherePosData[o + 2]!
      if (cutaway && y > 0 && z > 0) continue // same exclusion as pass 1
      const rr = spherePosData[o + 3]! // per-sphere radius written in pass 1
      const x0 = clampCell((x - rr - boundMin) / cellSize, last)
      const x1 = clampCell((x + rr - boundMin) / cellSize, last)
      const y0 = clampCell((y - rr - boundMin) / cellSize, last)
      const y1 = clampCell((y + rr - boundMin) / cellSize, last)
      const z0 = clampCell((z - rr - boundMin) / cellSize, last)
      const z1 = clampCell((z + rr - boundMin) / cellSize, last)
      for (let cz = z0; cz <= z1; cz++) {
        for (let cy = y0; cy <= y1; cy++) {
          const base = (cz * gridRes + cy) * gridRes
          for (let cx = x0; cx <= x1; cx++) {
            const c = base + cx
            const p = counts[c]!
            if (p < indexCapacity) {
              indexListData[p] = i
              counts[c] = p + 1
            }
          }
        }
      }
    }

    this.spherePosTex.needsUpdate = true
    this.cellRangeTex.needsUpdate = true
    this.indexListTex.needsUpdate = true
  }

  dispose(): void {
    this.spherePosTex.dispose()
    this.cellRangeTex.dispose()
    this.indexListTex.dispose()
  }
}

function clampCell(f: number, last: number): number {
  const c = Math.floor(f)
  return c < 0 ? 0 : c > last ? last : c
}
