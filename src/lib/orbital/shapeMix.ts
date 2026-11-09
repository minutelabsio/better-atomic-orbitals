import type { OrbitalShape } from './orbitalShape.js'

/**
 * A lazily-evaluated blend of two shapes: `from` at k=0, `to` at k=1.
 *
 * This is the intween interpolator's output. Rather than lerping two 50k-element
 * arrays inside the interpolator (allocating per frame), it returns this tiny
 * description and the arrays are combined once per frame by `evaluateShape`.
 * Mixes nest: when a transition is retargeted mid-flight, intween's `smoothen`
 * composes interpolations, so `from`/`to` may themselves be mixes.
 */
export interface ShapeMix {
  kind: 'mix'
  from: ShapeExpr
  to: ShapeExpr
  k: number
}

export type ShapeExpr = OrbitalShape | ShapeMix

/** intween interpolator `(from, to, k) => value` for shape expressions. */
export function mixShapes(
  from: ShapeExpr,
  to: ShapeExpr,
  k: number,
): ShapeExpr {
  if (k <= 0) return from
  if (k >= 1) return to
  return { kind: 'mix', from, to, k }
}

/** Per-depth scratch buffers so evaluation allocates only on first use. */
export class ShapeScratch {
  private readonly pool: Float32Array[][] = []
  constructor(readonly count: number) {}

  pair(
    depth: number,
  ): [Float32Array, Float32Array, Float32Array, Float32Array] {
    let p = this.pool[depth]
    if (!p) {
      p = [0, 1, 2, 3].map(() => new Float32Array(this.count))
      this.pool[depth] = p
    }
    return p as [Float32Array, Float32Array, Float32Array, Float32Array]
  }
}

/**
 * Write the per-particle (r, polar) of `expr` into `outR` / `outPolar`.
 * Interpolates in spherical coordinates, so particles travel along arcs around
 * the nucleus rather than cutting straight through it. Because both endpoints
 * share each particle's uniforms (quantiles), lerping them is the displacement
 * interpolation of each marginal: radial nodes open up as particles part.
 */
export function evaluateShape(
  expr: ShapeExpr,
  outR: Float32Array,
  outPolar: Float32Array,
  scratch: ShapeScratch,
  depth = 0,
): void {
  if (expr.kind === 'orbital') {
    outR.set(expr.r)
    outPolar.set(expr.polar)
    return
  }
  const [aR, aP, bR, bP] = scratch.pair(depth)
  const fromR = resolve(expr.from, aR, aP, scratch, depth)
  const toR = resolve(expr.to, bR, bP, scratch, depth)
  const k = expr.k
  const n = outR.length
  for (let i = 0; i < n; i++) {
    const r0 = fromR[0][i]!
    const p0 = fromR[1][i]!
    outR[i] = r0 + (toR[0][i]! - r0) * k
    outPolar[i] = p0 + (toR[1][i]! - p0) * k
  }
}

/** Plain shapes are read in place (no copy); mixes are evaluated into scratch. */
function resolve(
  expr: ShapeExpr,
  r: Float32Array,
  p: Float32Array,
  scratch: ShapeScratch,
  depth: number,
): [Float32Array, Float32Array] {
  if (expr.kind === 'orbital') return [expr.r, expr.polar]
  evaluateShape(expr, r, p, scratch, depth + 1)
  return [r, p]
}
