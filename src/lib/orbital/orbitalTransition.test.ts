import { BehaviorSubject } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { seededRng } from './__fixtures__/seededRng.js'
import type { HydrogenState } from './fineStructure.js'
import {
  type MorphConfig,
  type OrbitalState,
  orbitalStates,
} from './orbitalTransition.js'
import { drawParticleUniforms } from './particleUniforms.js'

const uniforms = drawParticleUniforms(500, seededRng(1))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function morphHarness(initial: HydrogenState, config: MorphConfig) {
  const orbital$ = new BehaviorSubject<HydrogenState>(initial)
  const spin$ = new BehaviorSubject(0)
  const config$ = new BehaviorSubject(config)
  const states: OrbitalState[] = []
  const subscription = orbitalStates({
    orbital$,
    spin$,
    config$,
    uniforms,
  }).subscribe((state) => states.push(state))
  return { orbital$, spin$, config$, states, subscription }
}

const largestStepInM = (states: OrbitalState[]) =>
  states.reduce(
    (largest, state, i) =>
      i === 0 ? 0 : Math.max(largest, Math.abs(state.m - states[i - 1]!.m)),
    0,
  )

describe('orbitalStates', () => {
  it('snaps to the first orbital, morphs, then lands exactly on the target', async () => {
    const { orbital$, states, subscription } = morphHarness(
      { n: 2, l: 1, m: 1 },
      { duration: 120, easing: 'linear' },
    )
    expect(states).toHaveLength(1)
    expect(states[0]!.m).toBe(1)

    orbital$.next({ n: 2, l: 1, m: -1 })
    await sleep(60)
    const mid = states.at(-1)!
    expect(mid.shape.kind).toBe('mix')
    expect(mid.m).toBeGreaterThan(-1)
    expect(mid.m).toBeLessThan(1)

    await sleep(200)
    const end = states.at(-1)!
    expect(end.m).toBe(-1)
    expect(end.shape.kind === 'orbital' && end.shape.orbital).toEqual({
      n: 2,
      l: 1,
      m: -1,
    })
    subscription.unsubscribe()
  })

  it('does not animate when the orbital is unchanged', async () => {
    const { orbital$, config$, states, subscription } = morphHarness(
      { n: 1, l: 0, m: 0 },
      { duration: 100, easing: 'linear' },
    )
    orbital$.next({ n: 1, l: 0, m: 0 })
    config$.next({ duration: 200, easing: 'quadInOut' })
    await sleep(150)
    expect(states).toHaveLength(1)
    subscription.unsubscribe()
  })

  it('retargets mid-flight without jumping', async () => {
    const { orbital$, states, subscription } = morphHarness(
      { n: 1, l: 0, m: 0 },
      { duration: 150, easing: 'linear' },
    )
    orbital$.next({ n: 3, l: 2, m: 2 })
    await sleep(60)
    expect(states.at(-1)!.m).toBeGreaterThan(0)
    orbital$.next({ n: 3, l: 2, m: -2 })
    await sleep(300)
    expect(states.at(-1)!.m).toBe(-2)
    // a snap (0→2 or 2→−2) would be a step of 2+; ~16ms frames of a 150ms
    // morph move m by well under 1
    expect(largestStepInM(states)).toBeLessThan(1)
    subscription.unsubscribe()
  })

  it('keeps morphing smoothly when the config changes mid-flight', async () => {
    const { orbital$, config$, states, subscription } = morphHarness(
      { n: 2, l: 1, m: 1 },
      { duration: 200, easing: 'linear' },
    )
    orbital$.next({ n: 2, l: 1, m: -1 })
    await sleep(80)
    config$.next({ duration: 150, easing: 'linear' })
    await sleep(300)
    expect(states.at(-1)!.m).toBe(-1)
    expect(largestStepInM(states)).toBeLessThan(1)
    subscription.unsubscribe()
  })

  it('fades the spin in without moving the particles', async () => {
    const { spin$, states, subscription } = morphHarness(
      { n: 2, l: 1, m: 1 },
      { duration: 120, easing: 'linear' },
    )
    expect(states[0]!.spin).toBe(0)
    spin$.next(1)
    await sleep(60)
    const mid = states.at(-1)!
    expect(mid.spin).toBeGreaterThan(0)
    expect(mid.spin).toBeLessThan(1)
    expect(mid.m).toBe(1)

    await sleep(200)
    const end = states.at(-1)!
    expect(end.spin).toBe(1)
    // intween clones the shape object; its arrays pass through by reference
    const shapeArray = (state: OrbitalState) =>
      state.shape.kind === 'orbital' && state.shape.r
    expect(shapeArray(end)).toBe(shapeArray(states[0]!))
    subscription.unsubscribe()
  })

  it('defaults to no spin', () => {
    const subscription = orbitalStates({
      orbital$: new BehaviorSubject({ n: 1, l: 0, m: 0 }),
      config$: new BehaviorSubject({ duration: 100, easing: 'linear' }),
      uniforms,
    }).subscribe((state) => expect(state.spin).toBe(0))
    subscription.unsubscribe()
  })

  it('morphs into a fine-structure state, fading the m/ρ² swirl out', async () => {
    const { orbital$, states, subscription } = morphHarness(
      { n: 2, l: 1, m: 1 },
      { duration: 120, easing: 'linear' },
    )
    orbital$.next({ n: 2, l: 1, j: 0.5, mj: 0.5 })
    await sleep(260)
    const end = states.at(-1)!
    // its whole flow comes from the shape's own field, not from m
    expect(end.m).toBe(0)
    expect(end.shape.kind === 'orbital' && end.shape.orbital).toEqual({
      n: 2,
      l: 1,
      j: 0.5,
      mj: 0.5,
    })
    subscription.unsubscribe()
  })

  it('fades in each particle’s own spin label (spin both) without moving the particles', async () => {
    const orbital$ = new BehaviorSubject<HydrogenState>({ n: 1, l: 0, m: 0 })
    const unpolarized$ = new BehaviorSubject(0)
    const states: OrbitalState[] = []
    const subscription = orbitalStates({
      orbital$,
      unpolarized$,
      config$: new BehaviorSubject({ duration: 120, easing: 'linear' }),
      uniforms,
    }).subscribe((state) => states.push(state))
    expect(states[0]!.unpolarized).toBe(0)
    unpolarized$.next(1)
    await sleep(60)
    const mid = states.at(-1)!.unpolarized!
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    await sleep(200)
    expect(states.at(-1)!.unpolarized).toBe(1)
    expect(states.at(-1)!.spin).toBe(0)
    subscription.unsubscribe()
  })
})
