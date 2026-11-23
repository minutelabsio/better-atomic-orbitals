import { isSpinSetting, type SpinSetting } from '../orbital/spinSetting'

/** Query param holding the electron spin: `?spin=up`. Absent means off. */
export const SPIN_PARAM = 'spin'

export const DEFAULT_SPIN: SpinSetting = 'off'

/** The spin a param value names; missing or invalid falls back to off. */
export function spinFromParam(text: string | null): SpinSetting {
  return text !== null && isSpinSetting(text) ? text : DEFAULT_SPIN
}

/** The param value for a spin; off is left out of the URL. */
export function spinToParam(spin: SpinSetting): string | null {
  return spin === DEFAULT_SPIN ? null : spin
}
