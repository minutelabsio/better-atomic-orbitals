import {
  distinctUntilChanged,
  filter,
  map,
  type Observable,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs'
import type { MorphConfig } from '../../orbital/orbitalTransition.js'
import { smoothen } from '../../rx/smoothen.js'

/**
 * How far the "separate by spin" view slides each spin's spheres along the
 * axis, world units. About 0.7 of the cloud radius: enough to pull the two
 * shapes apart while both stay in the default camera's view.
 */
export const SPIN_SEPARATION_DISTANCE = 1

interface SeparationState {
  /** 0 together … 1 fully separated */
  amount: number
}

export interface SeparationAmountsOptions {
  split$: Observable<boolean>
  config$: Observable<MorphConfig>
}

/**
 * How separated the spin-up and spin-down spheres are over time, 0 … 1: snaps
 * to the first setting, then tweens to each new one with the morph config.
 * Like `orbitalStates`, a change mid-flight starts from what's on screen.
 */
export function separationAmounts({
  split$,
  config$,
}: SeparationAmountsOptions): Observable<number> {
  // replayed so each tween pipeline (one per config) starts from the latest target
  const target$ = split$.pipe(
    map((split) => (split ? 1 : 0)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  )
  return target$.pipe(
    take(1),
    switchMap((initial) => tweensFrom({ amount: initial }, target$, config$)),
    map((state) => state.amount),
  )
}

function tweensFrom(
  initial: SeparationState,
  target$: Observable<number>,
  config$: Observable<MorphConfig>,
): Observable<SeparationState> {
  // the last state emitted, i.e. what is on screen: every tween starts here
  let current = initial
  return config$.pipe(
    switchMap((config) =>
      target$.pipe(
        filter((amount) => amount !== current.amount),
        map((amount) => ({ amount })),
        // intween needs the schema up front, or it takes the first target as its start
        smoothen<SeparationState>(config, () => current, {
          amount: current.amount,
        }),
      ),
    ),
    startWith(initial),
    tap((state) => {
      current = state
    }),
  )
}
