import type { FineStructureNumbers } from './fineStructure.js'
import { isFineStructureShape, type OrbitalShape } from './orbitalShape.js'
import type { OrbitalState } from './orbitalTransition.js'
import { dominantShape, type ParticleField } from './shapeMix.js'
import { spinAlongAxis } from './spinAlongAxis.js'

/**
 * Returns `spinAlongAxisOf(state)`: each particle's spin along the axis
 * (cos of its tilt; see `spinAlongAxis`), or undefined when the state has no
 * spin, i.e. a plain orbital with the spin setting off.
 *
 * A plain orbital with spin on is a pure spin-up or spin-down state: +1 or -1
 * for every particle. A direction doesn't blend, so mid-morph this snaps to
 * whichever end the morph is nearer (`dominantShape`, and the spin setting
 * rounded). The same array comes back until the answer changes, so callers
 * can compare by identity to skip re-uploads.
 */
export function createSpinAlongAxisResolver(
  count: number,
): (state: OrbitalState) => ParticleField | undefined {
  const plainSpinFields: Record<number, Float32Array | undefined> = {
    1: new Float32Array(count).fill(1),
    0: undefined,
    [-1]: new Float32Array(count).fill(-1),
  }
  // keyed by the shape's r array: intween clones shape objects, not their arrays
  const cache = new WeakMap<ArrayLike<number>, Float32Array>()
  const fineStructureField = (shape: OrbitalShape<FineStructureNumbers>) => {
    const field = cache.get(shape.r) ?? spinAlongAxis(shape)
    cache.set(shape.r, field)
    return field
  }

  return ({ shape, spin }) => {
    const nearest = dominantShape(shape)
    if (isFineStructureShape(nearest)) return fineStructureField(nearest)
    return plainSpinFields[Math.round(spin) || 0]
  }
}
