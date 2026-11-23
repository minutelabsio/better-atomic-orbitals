import { SPIN_DOWN, SPIN_UP } from './spinCurrent.js'

/** The electron's spin, as chosen in the UI: off leaves out the spin term. */
export const SPIN_SETTINGS = ['off', 'up', 'down'] as const

export type SpinSetting = (typeof SPIN_SETTINGS)[number]

const SPIN_PROJECTIONS: Record<SpinSetting, number> = {
  off: 0,
  up: SPIN_UP,
  down: SPIN_DOWN,
}

/** Spin projection on the axis in units of ħ/2; 0 turns the spin term off. */
export function spinProjection(setting: SpinSetting): number {
  return SPIN_PROJECTIONS[setting]
}

export function isSpinSetting(text: string): text is SpinSetting {
  return (SPIN_SETTINGS as readonly string[]).includes(text)
}
