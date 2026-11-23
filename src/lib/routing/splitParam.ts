/**
 * Query param for the "separate by spin" view: `?split=1`. Absent (or
 * anything else) means off.
 */
export const SPLIT_PARAM = 'split'

const ON = '1'

export function splitFromParam(text: string | null): boolean {
  return text === ON
}

/** The param value; off is left out of the URL. */
export function splitToParam(split: boolean): string | null {
  return split ? ON : null
}
