import { type Easing, Subject, type Subscription, smoothen } from 'intween'
import {
  type OrbitalShape,
  type OrbitalShapeOptions,
  orbitalShape,
} from './orbitalShape.js'
import type { ParticleUniforms } from './particleUniforms.js'
import { mixShapes, type ShapeExpr } from './shapeMix.js'

/**
 * The tweened state of the cloud. `shape` is where the particles sit; `m` is
 * the (possibly fractional, mid-transition) magnetic number that sets the swirl,
 * ω = m/ρ². Tweening m — rather than each particle's ω — keeps the motion
 * consistent with the shape at every instant: as ρ moves, ω follows; m → −m
 * slows the swirl to a stop and reverses it.
 */
export interface OrbitalState {
  shape: ShapeExpr
  m: number
}

export interface OrbitalTransitionOptions extends OrbitalShapeOptions {
  duration?: number | string
  easing?: Easing
  /** how many computed shapes to keep (each is 2 × count floats) */
  cacheSize?: number
}

/**
 * Drives orbital-to-orbital morphs with intween's `smoothen`: each `goTo` pushes
 * a target state, smoothen animates from wherever the cloud is right now, and
 * retargeting mid-flight composes instead of jumping. `onState` receives every
 * animated state (from smoothen's own animation-frame clock).
 */
export class OrbitalTransition {
  private readonly targets = new Subject<OrbitalState>()
  private sub: Subscription
  private readonly onState: (state: OrbitalState) => void
  private readonly cache = new Map<string, OrbitalShape>()
  private readonly cacheSize: number
  private readonly shapeOpts: OrbitalShapeOptions
  private target: OrbitalShape
  private state: OrbitalState

  constructor(
    private readonly uniforms: ParticleUniforms,
    initial: { n: number; l: number; m: number },
    onState: (state: OrbitalState) => void,
    {
      duration = 1500,
      easing = 'cubicInOut',
      cacheSize = 8,
      ...shapeOpts
    }: OrbitalTransitionOptions = {},
  ) {
    this.cacheSize = cacheSize
    this.shapeOpts = shapeOpts
    this.onState = onState
    this.target = this.shapeFor(initial.n, initial.l, initial.m)
    this.state = { shape: this.target, m: initial.m }
    onState(this.state)
    this.sub = this.connect(duration, easing)
  }

  /**
   * Change duration/easing. smoothen's config is fixed per pipeline, so this
   * rebuilds it starting from the current state; a morph in flight stops where
   * it is (fine for a dev knob).
   */
  configure(duration: number | string, easing: Easing): void {
    this.sub.unsubscribe()
    this.sub = this.connect(duration, easing)
  }

  private connect(duration: number | string, easing: Easing): Subscription {
    return this.targets
      .pipe(
        smoothen<OrbitalState>(
          { duration, easing },
          // smoothen starts each new target from here, so a retarget begins at
          // whatever is on screen
          () => this.state,
          {
            // explicit schema: shapes are opaque blobs mixed lazily (see
            // shapeMix.ts), not objects for intween to interpolate key-by-key
            shape: {
              type: Object,
              value: this.state.shape,
              interpolator: mixShapes,
            },
            m: this.state.m,
          },
        ),
      )
      .subscribe((s) => {
        this.state = s
        this.onState(s)
      })
  }

  /** Morph to orbital (n,l,m). No-op if that is already the target. */
  goTo(n: number, l: number, m: number): void {
    const t = this.target
    if (t.n === n && t.l === l && t.m === m) return
    this.target = this.shapeFor(n, l, m)
    this.targets.next({ shape: this.target, m })
  }

  dispose(): void {
    this.sub.unsubscribe()
    this.cache.clear()
  }

  private shapeFor(n: number, l: number, m: number): OrbitalShape {
    const key = `${n},${l},${m}`
    let s = this.cache.get(key)
    if (s) {
      this.cache.delete(key) // re-insert as most recent
    } else {
      s = orbitalShape(n, l, m, this.uniforms, this.shapeOpts)
      // evict least-recent; a shape still referenced by the animated state
      // stays alive through that reference, so eviction can't break a morph
      while (this.cache.size >= this.cacheSize) {
        const oldest = this.cache.keys().next().value as string
        this.cache.delete(oldest)
      }
    }
    this.cache.set(key, s)
    return s
  }
}
