import type { OrbitalShape, SphericalShape } from './orbitalShape.js'

/**
 * A lazily-evaluated blend of two shapes: `from` at k=0, `to` at k=1.
 *
 * This is the intween interpolator's output. Lerping two 50k-element arrays
 * inside the interpolator would allocate every frame; instead it returns this
 * tiny description, and `createShapeEvaluator` combines the arrays once per
 * frame. Mixes nest: retargeting mid-flight makes `smoothen` compose
 * interpolations, so `from`/`to` may themselves be mixes.
 */
export interface ShapeMix {
  readonly kind: 'mix'
  readonly from: ShapeExpr
  readonly to: ShapeExpr
  readonly k: number
}

export type ShapeExpr = OrbitalShape | ShapeMix

type Side = 'from' | 'to'

/** One number per particle, read-only. */
export type ParticleField = ArrayLike<number>

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

/**
 * Returns `evaluateShape(expr)`, which resolves a shape expression to
 * per-particle (r, polar). A plain shape is returned as is; a mix's result is
 * only valid until the next call.
 *
 * Interpolating in spherical coordinates moves particles along arcs around the
 * nucleus rather than through it, and because both endpoints come from the
 * same quantile per particle, the lerp is a displacement interpolation of each
 * marginal: radial nodes open up as particles part.
 */
export function createShapeEvaluator(
  count: number,
): (expr: ShapeExpr) => SphericalShape {
  const evaluateR = createFieldEvaluator(count, (shape) => shape.r)
  const evaluatePolar = createFieldEvaluator(count, (shape) => shape.polar)
  return (expr) => {
    if (expr.kind === 'orbital') return expr
    return { r: evaluateR(expr), polar: evaluatePolar(expr) }
  }
}

/**
 * Returns `evaluate(expr)`, which resolves a shape expression to one
 * per-particle field: `fieldOf` at each orbital, lerped through the mixes the
 * same way the shape is. Buffers are owned by the closure and reused, so a
 * mix's result is only valid until the next call.
 */
export function createFieldEvaluator(
  count: number,
  fieldOf: (shape: OrbitalShape) => ParticleField,
): (expr: ShapeExpr) => ParticleField {
  const bufferAt = createBufferPool(count)

  // A mix's two subtrees are resolved one after the other, so they can share
  // the deeper levels' buffers; each only needs its own buffer for its result.
  const resolve = (
    expr: ShapeExpr,
    depth: number,
    side: Side,
  ): ParticleField => {
    if (expr.kind === 'orbital') return fieldOf(expr)
    const from = resolve(expr.from, depth + 1, 'from')
    const to = resolve(expr.to, depth + 1, 'to')
    return lerpFields(from, to, expr.k, bufferAt(depth, side))
  }

  return (expr) => resolve(expr, 0, 'from')
}

function createBufferPool(
  count: number,
): (depth: number, side: Side) => Float32Array {
  const levels: Record<Side, Float32Array>[] = []
  const allocate = () => new Float32Array(count)
  return (depth, side) => {
    levels[depth] ??= { from: allocate(), to: allocate() }
    return levels[depth][side]
  }
}

// hot path (every frame, every particle): indexed loop into a reused buffer
function lerpFields(
  a: ParticleField,
  b: ParticleField,
  k: number,
  out: Float32Array,
): Float32Array {
  for (let i = 0; i < out.length; i += 1) {
    out[i] = a[i]! + (b[i]! - a[i]!) * k
  }
  return out
}
