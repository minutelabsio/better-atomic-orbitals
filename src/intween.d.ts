// Minimal types for the parts of intween (1.0.0-beta.9, untyped JS) we use.
declare module 'intween' {
  export interface Subscription {
    unsubscribe(): void
  }

  export interface Observable<T> {
    subscribe(next: (value: T) => void): Subscription
    pipe<R>(op: (source: Observable<T>) => Observable<R>): Observable<R>
  }

  export class Subject<T> implements Observable<T> {
    next(value: T): void
    subscribe(next: (value: T) => void): Subscription
    pipe<R>(op: (source: Observable<T>) => Observable<R>): Observable<R>
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
   * Turn a stream of target states into a stream of animated states, starting
   * from wherever the animation currently is; retargeting mid-flight composes.
   */
  export function smoothen<S>(
    config: SmoothenConfig,
    getState?: (() => S) | null,
    schema?: { [K in keyof S]: SchemaProp<S[K]> | S[K] },
  ): (source: Observable<Partial<S>>) => Observable<S>
}
