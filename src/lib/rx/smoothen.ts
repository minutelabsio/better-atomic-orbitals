import * as intween from 'intween'
import { Observable, type OperatorFunction } from 'rxjs'

/** intween's `smoothen`, as an rxjs operator so it composes in `.pipe(...)`. */
export function smoothen<S>(
  ...args: Parameters<typeof intween.smoothen<S>>
): OperatorFunction<Partial<S>, S> {
  const operator = intween.smoothen<S>(...args)
  return (source) =>
    new Observable<S>((subscriber) => operator(source).subscribe(subscriber))
}
