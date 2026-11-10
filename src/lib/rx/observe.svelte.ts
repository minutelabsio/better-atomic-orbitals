import { BehaviorSubject, type Observable } from 'rxjs'
import { untrack } from 'svelte'

/**
 * A reactive Svelte expression as an Observable: emits its current value on
 * subscribe and again whenever it changes. Call during component setup, since
 * it registers an `$effect`.
 */
export function observe<T>(read: () => T): Observable<T> {
  const subject = new BehaviorSubject(untrack(read))
  $effect(() => {
    subject.next(read())
  })
  return subject.asObservable()
}
