import type { HydrogenState } from '../orbital/fineStructure'
import {
  defaultSphereColoring,
  isSphereColoring,
  type SphereColoring,
} from '../scenes/manySpheres/sphereColoring'

/**
 * Query param holding the sphere coloring: `?color=measured`, `average` or
 * `plain` (see sphereColoring.ts). Absent means the state's default
 * (`defaultSphereColoring`), so a bare `?o=2p1/2m1/2` shows measured spin
 * colors and `?o=2p1` doesn't.
 */
export const COLOR_PARAM = 'color'

/** The coloring for `state`: the param's if it names one, else the state's default. */
export function coloringFromParam(
  text: string | null,
  state: HydrogenState,
): SphereColoring {
  return text !== null && isSphereColoring(text)
    ? text
    : defaultSphereColoring(state)
}

/** The param value for a coloring; the state's default is left out of the URL. */
export function coloringToParam(
  coloring: SphereColoring,
  state: HydrogenState,
): string | null {
  return coloring === defaultSphereColoring(state) ? null : coloring
}
