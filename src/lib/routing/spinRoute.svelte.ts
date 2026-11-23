import type { SpinSetting } from '../orbital/spinSetting'
import { SPIN_PARAM, spinFromParam, spinToParam } from './spinParam'
import { searchParams, setParam } from './url.svelte'

/** The selected electron spin, read from the URL. Reactive when called in `$derived`/templates. */
export function currentSpin(): SpinSetting {
  return spinFromParam(searchParams().get(SPIN_PARAM))
}

/** Select a spin by writing it to the URL. */
export function selectSpin(spin: SpinSetting): void {
  setParam(SPIN_PARAM, spinToParam(spin))
}
