import type { Easing } from 'intween'
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  type Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs'
import { smoothen } from '../rx/smoothen.js'
import { memoizeLru } from '../util/memoizeLru.js'
import {
  type HydrogenState,
  hydrogenStateKey,
  isFineStructure,
  isSameHydrogenState,
} from './fineStructure.js'
import { type OrbitalShapeOptions, orbitalShape } from './orbitalShape.js'
import type { ParticleUniforms } from './particleUniforms.js'
import { mixShapes, type ShapeExpr } from './shapeMix.js'

const DEFAULT_SHAPE_CACHE_SIZE = 8

/**
 * The animated state of the cloud. `shape` is where the particles sit; `m` is
 * the (possibly fractional, mid-transition) magnetic number that sets the swirl,
 * ω = m/ρ². Tweening m — rather than each particle's ω — keeps the motion
 * consistent with the shape at every instant: as ρ moves, ω follows; m → −m
 * slows the swirl to a stop and reverses it.
 *
 * `spin` is the spin projection on the axis (+1 up, −1 down, 0 off; fractional
 * mid-transition) that scales the spin-current term. That term depends on the
 * whole orbital, not just m, so it isn't recomputed from the in-between shape:
 * each particle's spin ω is blended between the endpoint orbitals alongside
 * the shape (see particleSwarm.ts).
 *
 * `unpolarized` (0 … 1, fractional mid-transition) is how much each particle's
 * own fixed spin label scales that term instead (the spin setting "both"; see
 * `unpolarizedSpin.ts`). Absent means 0.
 *
 * A fine-structure state's whole flow, orbital part included, comes from its
 * shape the same way (it isn't a function of one m), so its `m` is 0 and a
 * morph into or out of one fades the m/ρ² swirl against the blended field.
 */
export interface OrbitalState {
  readonly shape: ShapeExpr
  readonly m: number
  readonly spin: number
  readonly unpolarized?: number
}

export interface MorphConfig {
  /** ms, or an intween time string like '1.5s' */
  duration: number | string
  easing: Easing
}

export interface OrbitalStatesOptions {
  orbital$: Observable<HydrogenState>
  /** spin projection on the axis (see `spinProjection`); defaults to always 0 */
  spin$?: Observable<number>
  /** weight of each particle's own spin label (see `unpolarizedWeight`); defaults to always 0 */
  unpolarized$?: Observable<number>
  config$: Observable<MorphConfig>
  uniforms: ParticleUniforms
  shapeOptions?: OrbitalShapeOptions
  /** how many computed shapes to keep (each is 2 × count floats) */
  shapeCacheSize?: number
}

/**
 * The cloud's state over time: snaps to the first orbital, then morphs to each
 * new one. A morph starts from whatever is on screen, so retargeting mid-flight
 * composes instead of jumping — and so does changing the morph config.
 */
export function orbitalStates({
  orbital$,
  spin$ = of(0),
  unpolarized$ = of(0),
  config$,
  uniforms,
  shapeOptions,
  shapeCacheSize = DEFAULT_SHAPE_CACHE_SIZE,
}: OrbitalStatesOptions): Observable<OrbitalState> {
  const shapeFor = memoizeLru(
    (orbital: HydrogenState) => orbitalShape(orbital, uniforms, shapeOptions),
    { size: shapeCacheSize, key: hydrogenStateKey },
  )
  const toTargetState = ([orbital, spin, unpolarized]: [
    HydrogenState,
    number,
    number,
  ]): OrbitalState => ({
    shape: shapeFor(orbital),
    m: isFineStructure(orbital) ? 0 : orbital.m,
    spin,
    unpolarized,
  })
  // replayed so each morph pipeline (one per config) starts from the latest target
  const target$ = combineLatest([
    orbital$.pipe(distinctUntilChanged(isSameHydrogenState)),
    spin$.pipe(distinctUntilChanged()),
    unpolarized$.pipe(distinctUntilChanged()),
  ]).pipe(map(toTargetState), shareReplay({ bufferSize: 1, refCount: true }))

  return target$.pipe(
    take(1),
    switchMap((initial) => morphsFrom(initial, target$, config$)),
  )
}

function morphsFrom(
  initial: OrbitalState,
  target$: Observable<OrbitalState>,
  config$: Observable<MorphConfig>,
): Observable<OrbitalState> {
  // the last state emitted, i.e. what is on screen: every morph starts here
  let current = initial
  const isNotCurrentTarget = (target: OrbitalState) =>
    target.shape !== current.shape ||
    target.m !== current.m ||
    target.spin !== current.spin ||
    target.unpolarized !== current.unpolarized

  return config$.pipe(
    switchMap((config) =>
      target$.pipe(
        filter(isNotCurrentTarget),
        smoothen<OrbitalState>(config, () => current, orbitalSchema(current)),
      ),
    ),
    startWith(initial),
    tap((state) => {
      current = state
    }),
  )
}

/** Shapes are opaque blobs mixed lazily (see shapeMix.ts), not objects for intween to tween key-by-key. */
function orbitalSchema(state: OrbitalState) {
  return {
    shape: { type: Object, value: state.shape, interpolator: mixShapes },
    m: state.m,
    spin: state.spin,
    unpolarized: state.unpolarized ?? 0,
  }
}
