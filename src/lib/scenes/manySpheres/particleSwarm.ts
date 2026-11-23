import { fineStructureSwirl } from '../../orbital/fineStructureSwirl.js'
import {
  isFineStructureShape,
  isPlainOrbitalShape,
  type OrbitalShape,
  type SphericalShape,
} from '../../orbital/orbitalShape.js'
import type { OrbitalState } from '../../orbital/orbitalTransition.js'
import {
  drawParticleUniforms,
  type ParticleUniforms,
} from '../../orbital/particleUniforms.js'
import {
  createFieldEvaluator,
  createShapeEvaluator,
  type ParticleField,
} from '../../orbital/shapeMix.js'
import { spinUpSwirl } from '../../orbital/spinSwirl.js'
import { probabilityCurrentOmega } from '../../orbital/velocity.js'
import { cutawayFeatherScale } from './cutaway.js'

const SPHERE_STRIDE = 4 // xyz centre + radius per sphere

export interface ParticleSwarmOptions {
  count: number
  /** softening added to ρ² so the swirl stays finite near the spin axis */
  omegaSoftening?: number
  rng?: () => number
}

/** How each particle is drawn as a sphere. */
export interface SphereStyle {
  sphereRadius: number
  /** fraction (0..1); each radius is scaled by 1 ± radiusVariation, fixed per particle */
  radiusVariation?: number
  cutaway?: boolean
  /** world-space band over which spheres shrink to zero approaching the cut */
  cutawayFeather?: number
  /** slide spheres along world Y by distance × their direction (drawing only) */
  separation?: Separation
}

/** A per-sphere shift along world Y, applied where spheres are written out. */
export interface Separation {
  /** world units for a direction of 1 */
  distance: number
  /** per particle, typically ±1 */
  direction: ParticleField
}

export interface ParticleSwarm {
  /** per-particle random numbers, fixed for life; every orbital shape is computed from these */
  readonly uniforms: ParticleUniforms
  /** move the particles to `state` and set their swirl from its m and spin */
  setOrbitalState(state: OrbitalState): void
  /** spin every particle about the Y axis by its own angular velocity × speedScale */
  advance(speedScale: number): void
  /** write each particle as a sphere (xyz centre + radius) into `out` */
  writeSpheres(out: Float32Array, style: SphereStyle): void
}

/** Per-particle motion state, in cylindrical coordinates about the spin (Y) axis. */
interface SwarmMotion {
  readonly count: number
  readonly rho: Float32Array
  readonly phi: Float32Array
  readonly height: Float32Array
  /** angular velocity about the spin axis */
  readonly omega: Float32Array
  /** fixed per particle, in [-1, 1] */
  readonly radiusJitter: Float32Array
}

/**
 * The particles and their motion. Motion is a rigid spin about the Y axis, so
 * it's stored in cylindrical coordinates (ρ, φ, y); orbital shapes arrive in
 * spherical and spheres leave in cartesian.
 *
 * The frame is right-handed about +Y: increasing φ is a positive rotation
 * about +Y, so positive m and spin up both point along world +Y.
 */
export function createParticleSwarm({
  count,
  omegaSoftening = 0.02,
  rng = Math.random,
}: ParticleSwarmOptions): ParticleSwarm {
  const uniforms = drawParticleUniforms(count, rng)
  const evaluateShape = createShapeEvaluator(count)
  const noSwirl = new Float32Array(count)
  const evaluateSpinSwirl = createFieldEvaluator(
    count,
    memoizeShapeField((shape) =>
      isPlainOrbitalShape(shape) ? spinUpSwirl(shape, omegaSoftening) : noSwirl,
    ),
  )
  const evaluateFineStructureSwirl = createFieldEvaluator(
    count,
    memoizeShapeField((shape) =>
      isFineStructureShape(shape)
        ? fineStructureSwirl(shape, omegaSoftening)
        : noSwirl,
    ),
  )
  const motion: SwarmMotion = {
    count,
    rho: new Float32Array(count),
    phi: Float32Array.from(uniforms.phi),
    height: new Float32Array(count),
    omega: new Float32Array(count),
    radiusJitter: Float32Array.from({ length: count }, () => rng() * 2 - 1),
  }

  return {
    uniforms,
    setOrbitalState({ shape, m, spin }) {
      placeOnShape(motion, evaluateShape(shape))
      setSwirl(motion, m, omegaSoftening)
      if (spin !== 0) addSwirl(motion, spin, evaluateSpinSwirl(shape))
      addSwirl(motion, 1, evaluateFineStructureSwirl(shape))
    },
    advance(speedScale) {
      spin(motion, speedScale)
    },
    writeSpheres(out, style) {
      writeSpheres(motion, out, style)
    },
  }
}

/**
 * A per-particle field of each orbital shape (such as the spin-up swirl),
 * computed the first time it's asked for. Keyed by the shape's `r` array
 * rather than the shape: intween clones the shape object as it tweens, but
 * passes its typed arrays through untouched.
 */
function memoizeShapeField(
  fieldOf: (shape: OrbitalShape) => ParticleField,
): (shape: OrbitalShape) => ParticleField {
  const cache = new WeakMap<ArrayLike<number>, ParticleField>()
  return (shape) => {
    const cached = cache.get(shape.r)
    if (cached) return cached
    const field = fieldOf(shape)
    cache.set(shape.r, field)
    return field
  }
}

// Per-frame hot loops: module-level functions over explicit buffers rather
// than closures, which measured slower once a second instance existed (e.g.
// after a remount).

/** Spherical shape → cylindrical (ρ, y); φ is untouched, it belongs to the motion. */
function placeOnShape(
  { count, rho, height }: SwarmMotion,
  { r, polar }: SphericalShape,
): void {
  for (let i = 0; i < count; i += 1) {
    rho[i] = r[i]! * Math.sin(polar[i]!)
    height[i] = r[i]! * Math.cos(polar[i]!)
  }
}

/** ω = m/ρ² (softened): the probability-current swirl for magnetic number m. */
function setSwirl(
  { count, rho, omega }: SwarmMotion,
  m: number,
  softening: number,
): void {
  for (let i = 0; i < count; i += 1) {
    omega[i] = probabilityCurrentOmega(rho[i]!, m, softening)
  }
}

/** ω += scale × swirl, per particle (e.g. spin × the spin-up spin term). */
function addSwirl(
  { count, omega }: SwarmMotion,
  scale: number,
  swirl: ParticleField,
): void {
  for (let i = 0; i < count; i += 1) {
    omega[i]! += scale * swirl[i]!
  }
}

function spin({ count, phi, omega }: SwarmMotion, speedScale: number): void {
  for (let i = 0; i < count; i += 1) {
    phi[i]! += speedScale * omega[i]!
  }
}

function writeSpheres(
  { count, rho, phi, height, radiusJitter }: SwarmMotion,
  out: Float32Array,
  {
    sphereRadius,
    radiusVariation = 0,
    cutaway = false,
    cutawayFeather = 0,
    separation,
  }: SphereStyle,
): void {
  for (let i = 0; i < count; i += 1) {
    // (ê_ρ, ê_φ, +Y) right-handed: φ turns +Z toward +X, hence z = -ρ sin φ
    const x = rho[i]! * Math.cos(phi[i]!)
    const shift = separation
      ? separation.distance * separation.direction[i]!
      : 0
    const y = height[i]! + shift
    const z = -rho[i]! * Math.sin(phi[i]!)
    const radius = sphereRadius * (1 + radiusVariation * radiusJitter[i]!)
    const feather = cutaway ? cutawayFeatherScale(y, z, cutawayFeather) : 1
    const o = i * SPHERE_STRIDE
    out[o] = x
    out[o + 1] = y
    out[o + 2] = z
    out[o + 3] = radius * feather
  }
}
