import type { SphereColoring } from '../scenes/manySpheres/sphereColoring'
import { COLOR_PARAM, coloringFromParam, coloringToParam } from './colorParam'
import { currentOrbital } from './orbitalRoute.svelte'
import { currentSpin } from './spinRoute.svelte'
import { searchParams, setParam } from './url.svelte'

/** The sphere coloring, read from the URL. Reactive when called in `$derived`/templates. */
export function currentColoring(): SphereColoring {
  return coloringFromParam(searchParams().get(COLOR_PARAM), currentContext())
}

/** Select a coloring by writing it to the URL (left out when it's the state's default). */
export function selectColoring(coloring: SphereColoring): void {
  setParam(COLOR_PARAM, coloringToParam(coloring, currentContext()))
}

function currentContext() {
  return { orbital: currentOrbital(), spin: currentSpin() }
}
