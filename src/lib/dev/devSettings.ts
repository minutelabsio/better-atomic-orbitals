import { GI_OBJECT_SPACE, lutOptions, morphEasingOptions } from './devOptions'

/** Every knob exposed by the dev panel. Plain data; App owns it as $state. */
export interface DevSettings {
  lutPath: string
  giStrategy: number
  count: number
  resScale: number
  speed: number
  /** ms */
  morphDuration: number
  morphEasing: string
  /** screen-space temporal accumulation blend */
  blend: number
  /** object-space per-sphere accumulation blend */
  objBlend: number
  objSamples: number
  randomize: boolean
  indirect: boolean
  cutaway: boolean
  cutawayFeather: number
  radius: number
  radiusVariation: number
  sphereColor: string
  bgColor: string
}

export const defaultDevSettings = (): DevSettings => ({
  lutPath: lutOptions[0]!.value,
  giStrategy: GI_OBJECT_SPACE,
  count: 50000,
  resScale: 0.5,
  speed: 0.001,
  morphDuration: 1500,
  morphEasing: morphEasingOptions[0]!,
  blend: 0.28,
  objBlend: 0.01,
  objSamples: 1,
  randomize: true,
  indirect: true,
  cutaway: false,
  cutawayFeather: 0.05,
  radius: 0.012,
  radiusVariation: 0,
  sphereColor: '#f1921f',
  bgColor: '#ffffff',
})
