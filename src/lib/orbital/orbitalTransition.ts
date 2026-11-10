import type { Easing } from 'intween'
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
import { smoothen } from '../rx/smoothen.js'
import { memoizeLru } from '../util/memoizeLru.js'
import { type OrbitalShapeOptions, orbitalShape } from './orbitalShape.js'
import type { ParticleUniforms } from './particleUniforms.js'
import {
  isSameOrbital,
  orbitalKey,
  type QuantumNumbers,
} from './quantumNumbers.js'
import { mixShapes, type ShapeExpr } from './shapeMix.js'

const DEFAULT_SHAPE_CACHE_SIZE = 8

/**
 * The animated state of the cloud. `shape` is where the particles sit; `m` is
 * the (possibly fractional, mid-transition) magnetic number that sets the swirl,
 * ω = m/ρ². Tweening m — rather than each particle's ω — keeps the motion
 * consistent with the shape at every instant: as ρ moves, ω follows; m → −m
 * slows the swirl to a stop and reverses it.
 */
export interface OrbitalState {
  readonly shape: ShapeExpr
  readonly m: number
}

export interface MorphConfig {
  /** ms, or an intween time string like '1.5s' */
  duration: number | string
  easing: Easing
}

export interface OrbitalStatesOptions {
  orbital$: Observable<QuantumNumbers>
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
  config$,
  uniforms,
  shapeOptions,
  shapeCacheSize = DEFAULT_SHAPE_CACHE_SIZE,
}: OrbitalStatesOptions): Observable<OrbitalState> {
  const shapeFor = memoizeLru(
    (orbital: QuantumNumbers) => orbitalShape(orbital, uniforms, shapeOptions),
    { size: shapeCacheSize, key: orbitalKey },
  )
  const toTargetState = (orbital: QuantumNumbers): OrbitalState => ({
    shape: shapeFor(orbital),
    m: orbital.m,
  })
  // replayed so each morph pipeline (one per config) starts from the latest target
  const target$ = orbital$.pipe(
    distinctUntilChanged(isSameOrbital),
    map(toTargetState),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

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
    target.shape !== current.shape || target.m !== current.m

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
  }
}
