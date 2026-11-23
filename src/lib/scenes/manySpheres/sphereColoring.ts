import {
  type HydrogenState,
  isFineStructure,
} from '../../orbital/fineStructure'

/**
 * How spheres are colored: `spin` by each sphere's spin direction (see
 * spinPalette.ts), `plain` all in the one sphere color.
 */
export const SPHERE_COLORINGS = ['spin', 'plain'] as const

export type SphereColoring = (typeof SPHERE_COLORINGS)[number]

export function isSphereColoring(text: string): text is SphereColoring {
  return (SPHERE_COLORINGS as readonly string[]).includes(text)
}

/**
 * The coloring a state gets unless one is chosen: a fine-structure state's
 * spin texture is the point of showing it, so it gets `spin`; plain orbitals
 * keep their one color.
 */
export function defaultSphereColoring(state: HydrogenState): SphereColoring {
  return isFineStructure(state) ? 'spin' : 'plain'
}
