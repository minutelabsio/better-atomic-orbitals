import {
  type ColoringContext,
  defaultSphereColoring,
  isSphereColoring,
  type SphereColoring,
} from '../scenes/manySpheres/sphereColoring'

/**
 * Query param holding the sphere coloring: `?color=measured`, `average` or
 * `plain` (see sphereColoring.ts). Absent means the state's default
 * (`defaultSphereColoring`), so a bare `?o=2p1/2m1/2` or `?o=1s&spin=both`
 * shows spin colors and `?o=2p1` doesn't.
 */
export const COLOR_PARAM = 'color'

/** The coloring: the param's if it names one, else the default for `context`. */
export function coloringFromParam(
  text: string | null,
  context: ColoringContext,
): SphereColoring {
  return text !== null && isSphereColoring(text)
    ? text
    : defaultSphereColoring(context)
}

/** The param value for a coloring; the default for `context` is left out of the URL. */
export function coloringToParam(
  coloring: SphereColoring,
  context: ColoringContext,
): string | null {
  return coloring === defaultSphereColoring(context) ? null : coloring
}
