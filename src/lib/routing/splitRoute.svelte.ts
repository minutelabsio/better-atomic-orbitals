import { SPLIT_PARAM, splitFromParam, splitToParam } from './splitParam'
import { searchParams, setParam } from './url.svelte'

/** Whether "separate by spin" is on, read from the URL. Reactive when called in `$derived`/templates. */
export function currentSplit(): boolean {
  return splitFromParam(searchParams().get(SPLIT_PARAM))
}

/** Turn "separate by spin" on or off by writing it to the URL. */
export function selectSplit(split: boolean): void {
  setParam(SPLIT_PARAM, splitToParam(split))
}
