import { LUTS } from '../../luts'
import {
  allFineStructureStates,
  FINE_STRUCTURE_MAX_N,
  fineStructureLabel,
} from '../orbital/fineStructureCatalog'
import { formatFineStructureNotation } from '../orbital/fineStructureNotation'
import { allOrbitals, MAX_N, orbitalLabel } from '../orbital/orbitalCatalog'
import { formatOrbitalNotation } from '../orbital/orbitalNotation'
import { SPIN_SETTINGS } from '../orbital/spinSetting'

/** Choices offered by the dev panel's dropdowns, as tweakpane List options. */

/**
 * values are URL notation (`3d1`, `2p3/2m1/2`), matching the `?o=` param;
 * the |n l m⟩ orbitals first, then the fine-structure states
 */
export const orbitalOptions = [
  ...allOrbitals(MAX_N).map((o) => ({
    text: orbitalLabel(o),
    value: formatOrbitalNotation(o),
  })),
  ...allFineStructureStates(FINE_STRUCTURE_MAX_N).map((state) => ({
    text: fineStructureLabel(state),
    value: formatFineStructureNotation(state),
  })),
]

export const spinOptions = SPIN_SETTINGS.map((value) => ({
  text: value,
  value,
}))

export const lutOptions = LUTS.map(({ label, path }) => ({
  text: label,
  value: path,
}))

export const GI_SCREEN_SPACE = 0
export const GI_OBJECT_SPACE = 1

export const giStrategyOptions = [
  { text: 'Screen-space temporal', value: GI_SCREEN_SPACE },
  { text: 'Object-space per-sphere', value: GI_OBJECT_SPACE },
]

export const countOptions = [2000, 10000, 50000, 100000].map((value) => ({
  text: value.toLocaleString(),
  value,
}))

export const resScaleOptions = [
  { text: 'Full', value: 1 },
  { text: '¾', value: 0.75 },
  { text: '½', value: 0.5 },
]

export const morphEasingOptions = [
  'cubicInOut',
  'quadInOut',
  'sinInOut',
  'expInOut',
  'cubicOut',
  'backInOut',
  'linear',
]
