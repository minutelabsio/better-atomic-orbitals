import {
  type HydrogenState,
  isFineStructure,
} from '../../orbital/fineStructure'
import type { SpinField } from '../../orbital/spinFieldOfState'

/**
 * How spheres are colored: `measured` two colors, by the spin up/down a
 * measurement would find at each sphere (`measuredSpin.ts`); `average` a
 * gradient, by the local average spin's tilt (`spinAlongAxis.ts`); `plain`
 * all in the one sphere color.
 */
export const SPHERE_COLORINGS = ['measured', 'average', 'plain'] as const

export type SphereColoring = (typeof SPHERE_COLORINGS)[number]

export function isSphereColoring(text: string): text is SphereColoring {
  return (SPHERE_COLORINGS as readonly string[]).includes(text)
}

/**
 * The coloring a state gets unless one is chosen: a fine-structure state's
 * mix of spin up and down is the point of showing it, so it gets `measured`;
 * plain orbitals keep their one color.
 */
export function defaultSphereColoring(state: HydrogenState): SphereColoring {
  return isFineStructure(state) ? 'measured' : 'plain'
}

/** The per-sphere spin a coloring shows; undefined for `plain`. */
export function spinFieldOf(coloring: SphereColoring): SpinField | undefined {
  return coloring === 'plain' ? undefined : coloring
}
