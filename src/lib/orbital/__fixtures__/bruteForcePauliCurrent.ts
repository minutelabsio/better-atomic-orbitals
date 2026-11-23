/**
 * A slow, independent reference for the Pauli current of a two-component
 * spinor: complex components built from hand-written hydrogen tables (no
 * Legendre/Laguerre code), derivatives by central finite differences, in a
 * right-handed cartesian frame with the quantization axis along z.
 */

type Complex = readonly [re: number, im: number]
type Vec3 = readonly [number, number, number]

const FOUR_PI = 4 * Math.PI

/** Polar parts of Y_l^m with Condon–Shortley phase, l ≤ 2 (Griffiths table 4.3). */
export const Y_POLAR: Record<string, (c: number, s: number) => number> = {
  '0,0': () => Math.sqrt(1 / FOUR_PI),
  '1,0': (c) => Math.sqrt(3 / FOUR_PI) * c,
  '1,1': (_, s) => -Math.sqrt(3 / (2 * FOUR_PI)) * s,
  '1,-1': (_, s) => Math.sqrt(3 / (2 * FOUR_PI)) * s,
  '2,0': (c) => Math.sqrt(5 / (4 * FOUR_PI)) * (3 * c * c - 1),
  '2,1': (c, s) => -Math.sqrt(15 / (2 * FOUR_PI)) * s * c,
  '2,-1': (c, s) => Math.sqrt(15 / (2 * FOUR_PI)) * s * c,
  '2,2': (_, s) => Math.sqrt(15 / (8 * FOUR_PI)) * s * s,
  '2,-2': (_, s) => Math.sqrt(15 / (8 * FOUR_PI)) * s * s,
}

/** Unnormalized R_nl, n ≤ 3 (the factor is shared by both components). */
const RADIAL: Record<string, (r: number) => number> = {
  '1,0': (r) => Math.exp(-r),
  '2,0': (r) => (2 - r) * Math.exp(-r / 2),
  '2,1': (r) => r * Math.exp(-r / 2),
  '3,0': (r) => (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3),
  '3,1': (r) => r * (6 - r) * Math.exp(-r / 3),
  '3,2': (r) => r * r * Math.exp(-r / 3),
}

export interface SpinorTerm {
  /** orbital magnetic number; |m| > l means the component is absent */
  m: number
  amplitude: number
}

function component(
  n: number,
  l: number,
  { m, amplitude }: SpinorTerm,
  [x, y, z]: Vec3,
): Complex {
  if (Math.abs(m) > l || amplitude === 0) return [0, 0]
  const r = Math.hypot(x, y, z)
  const polar = Y_POLAR[`${l},${m}`]!(z / r, Math.hypot(x, y) / r)
  const magnitude = amplitude * RADIAL[`${n},${l}`]!(r) * polar
  const phi = Math.atan2(y, x)
  return [magnitude * Math.cos(m * phi), magnitude * Math.sin(m * phi)]
}

const H = 1e-5

const shifted = ([x, y, z]: Vec3, axis: number, by: number): Vec3 => [
  axis === 0 ? x + by : x,
  axis === 1 ? y + by : y,
  axis === 2 ? z + by : z,
]

/** ∂/∂(axis) of a complex function at p, central difference. */
function partial(f: (p: Vec3) => Complex, p: Vec3, axis: number): Complex {
  const [aRe, aIm] = f(shifted(p, axis, H))
  const [bRe, bIm] = f(shifted(p, axis, -H))
  return [(aRe - bRe) / (2 * H), (aIm - bIm) / (2 * H)]
}

/** Im(conj(a) b) */
const imConjProduct = ([aRe, aIm]: Complex, [bRe, bIm]: Complex) =>
  aRe * bIm - aIm * bRe
/** Re(conj(a) b) */
const reConjProduct = ([aRe, aIm]: Complex, [bRe, bIm]: Complex) =>
  aRe * bRe + aIm * bIm
const squared = (a: Complex) => reConjProduct(a, a)

/**
 * The Pauli velocity v = (Im(ψ†∇ψ) + ½∇×(ψ†σψ)) / ψ†ψ at cartesian p, atomic
 * units, for ψ = R_nl (up Y↑ ↑ + down Y↓ ↓).
 */
export function bruteForcePauliVelocity(
  n: number,
  l: number,
  up: SpinorTerm,
  down: SpinorTerm,
  p: Vec3,
): Vec3 {
  const upAt = (q: Vec3) => component(n, l, up, q)
  const downAt = (q: Vec3) => component(n, l, down, q)
  const spinDensityAt = (q: Vec3): Vec3 => {
    const u = upAt(q)
    const d = downAt(q)
    return [
      2 * reConjProduct(u, d),
      2 * imConjProduct(u, d),
      squared(u) - squared(d),
    ]
  }
  const spinDensityPartial = (axis: number, of: 0 | 1 | 2) =>
    (spinDensityAt(shifted(p, axis, H))[of] -
      spinDensityAt(shifted(p, axis, -H))[of]) /
    (2 * H)

  const u = upAt(p)
  const d = downAt(p)
  const density = squared(u) + squared(d)
  const velocityAlong = (axis: number, curl: number) =>
    (imConjProduct(u, partial(upAt, p, axis)) +
      imConjProduct(d, partial(downAt, p, axis)) +
      curl / 2) /
    density
  return [
    velocityAlong(0, spinDensityPartial(1, 2) - spinDensityPartial(2, 1)),
    velocityAlong(1, spinDensityPartial(2, 0) - spinDensityPartial(0, 2)),
    velocityAlong(2, spinDensityPartial(0, 1) - spinDensityPartial(1, 0)),
  ]
}
