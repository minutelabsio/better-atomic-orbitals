import type { FineStructureNumbers } from './fineStructure.js'
import { measuredSpin } from './measuredSpin.js'
import { isFineStructureShape, type OrbitalShape } from './orbitalShape.js'
import type { OrbitalState } from './orbitalTransition.js'
import { dominantShape, type ParticleField } from './shapeMix.js'
import { spinAlongAxis } from './spinAlongAxis.js'

/**
 * Which per-particle spin to show: `measured` is each particle's ±1 outcome
 * of measuring S_z (`measuredSpin`); `average` is the local expectation
 * value, the cos of the tilt of ψ†σψ (`spinAlongAxis`).
 */
export type SpinField = 'measured' | 'average'

export interface SpinFieldResolverOptions {
  count: number
  /** each particle's fixed spin uniform (`ParticleUniforms.uSpin`) */
  uSpin: ArrayLike<number>
}

/**
 * Returns `spinFieldOf(state, field)`: each particle's spin along the axis
 * (+1 up … -1 down), or undefined when the state has no spin, i.e. a plain
 * orbital with the spin setting off.
 *
 * A plain orbital with spin on is a pure spin-up or spin-down state: +1 or -1
 * for every particle, whichever field. A spin doesn't blend, so mid-morph
 * this snaps to whichever end the morph is nearer (`dominantShape`, and the
 * spin setting rounded). The same array comes back until the answer changes,
 * so callers can compare by identity to skip re-uploads.
 */
export function createSpinFieldResolver({
  count,
  uSpin,
}: SpinFieldResolverOptions): (
  state: OrbitalState,
  field: SpinField,
) => ParticleField | undefined {
  const plainSpinFields: Record<number, Float32Array | undefined> = {
    1: new Float32Array(count).fill(1),
    0: undefined,
    [-1]: new Float32Array(count).fill(-1),
  }
  const FIELDS: Record<
    SpinField,
    (shape: OrbitalShape<FineStructureNumbers>) => Float32Array
  > = {
    measured: (shape) => measuredSpin(shape, uSpin),
    average: spinAlongAxis,
  }
  // keyed by the shape's r array: intween clones shape objects, not their arrays
  const caches: Record<SpinField, WeakMap<ArrayLike<number>, Float32Array>> = {
    measured: new WeakMap(),
    average: new WeakMap(),
  }
  const fineStructureField = (
    shape: OrbitalShape<FineStructureNumbers>,
    field: SpinField,
  ) => {
    const cache = caches[field]
    const values = cache.get(shape.r) ?? FIELDS[field](shape)
    cache.set(shape.r, values)
    return values
  }

  return ({ shape, spin }, field) => {
    const nearest = dominantShape(shape)
    if (isFineStructureShape(nearest)) return fineStructureField(nearest, field)
    return plainSpinFields[Math.round(spin) || 0]
  }
}
