// Minimal types for the parts of intween (1.0.0-beta.9, untyped JS) we use.
declare module 'intween' {
  export interface Unsubscribable {
    unsubscribe(): void
  }

  export interface Observer<T> {
    next(value: T): void
    error(err: unknown): void
    complete(): void
  }

  /** Anything with an observer-object `subscribe`: intween and rxjs Observables both qualify. */
  export interface Subscribable<T> {
    subscribe(observer: Observer<T>): Unsubscribable
  }

  export type Easing = string | ((k: number) => number)

  export interface SmoothenConfig {
    /** ms, or an intween time string like '1.5s' */
    duration?: number | string
    easing?: Easing
  }

  export interface SchemaProp<V> {
    type?: unknown
    value: V
    interpolator?: string | ((from: V, to: V, k: number) => V)
  }

  /**
   * Turn a stream of target states into a stream of animated states (one per
   * animation frame while moving), starting from `getState()`; retargeting
   * mid-flight composes.
   */
  export function smoothen<S>(
    config: SmoothenConfig,
    getState?: (() => S) | null,
    schema?: { [K in keyof S]: SchemaProp<S[K]> | S[K] },
  ): (source: Subscribable<Partial<S>>) => Subscribable<S>
}
