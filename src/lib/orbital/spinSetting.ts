import { SPIN_DOWN, SPIN_UP } from './spinCurrent.js'

/**
 * The electron's spin, as chosen in the UI: off leaves out the spin term;
 * both is an unpolarized mixture, each particle spin up or down for life
 * (see `unpolarizedSpin.ts`).
 */
export const SPIN_SETTINGS = ['off', 'both', 'up', 'down'] as const

export type SpinSetting = (typeof SPIN_SETTINGS)[number]

const SPIN_PROJECTIONS: Record<SpinSetting, number> = {
  off: 0,
  both: 0,
  up: SPIN_UP,
  down: SPIN_DOWN,
}

/**
 * Spin projection on the axis shared by every particle, in units of ħ/2; 0
 * when spin is off or each particle has its own (both).
 */
export function spinProjection(setting: SpinSetting): number {
  return SPIN_PROJECTIONS[setting]
}

/**
 * How much each particle's own spin label applies (see `unpolarizedSpin.ts`):
 * 1 for both, 0 otherwise.
 */
export function unpolarizedWeight(setting: SpinSetting): number {
  return setting === 'both' ? 1 : 0
}

export function isSpinSetting(text: string): text is SpinSetting {
  return (SPIN_SETTINGS as readonly string[]).includes(text)
}
