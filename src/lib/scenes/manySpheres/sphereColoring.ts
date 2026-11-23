import {
  type HydrogenState,
  isFineStructure,
} from '../../orbital/fineStructure'
import type { SpinField } from '../../orbital/spinFieldOfState'
import type { SpinSetting } from '../../orbital/spinSetting'

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

/** What the default coloring depends on: the selected state and spin setting. */
export interface ColoringContext {
  orbital: HydrogenState
  spin: SpinSetting
}

/**
 * The coloring a view gets unless one is chosen. A fine-structure state's mix
 * of spin up and down is the point of showing it, and so is spin "both" (a
 * mixture of spin-up and spin-down atoms), so those get `measured`; other
 * plain orbitals keep their one color.
 */
export function defaultSphereColoring({
  orbital,
  spin,
}: ColoringContext): SphereColoring {
  return isFineStructure(orbital) || spin === 'both' ? 'measured' : 'plain'
}

/** The per-sphere spin a coloring shows; undefined for `plain`. */
export function spinFieldOf(coloring: SphereColoring): SpinField | undefined {
  return coloring === 'plain' ? undefined : coloring
}
