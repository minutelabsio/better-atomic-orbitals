export interface MemoizeLruOptions<A> {
  /** how many results to keep */
  size: number
  /** cache key for an argument */
  key: (arg: A) => string
}

/**
 * Memoize a one-argument function, keeping the `size` most recently used
 * results. A Map iterates in insertion order, so re-inserting on every hit
 * keeps the least recently used entry first, ready to evict.
 */
export function memoizeLru<A, R>(
  fn: (arg: A) => R,
  { size, key }: MemoizeLruOptions<A>,
): (arg: A) => R {
  const cache = new Map<string, R>()

  const evictOldest = () => {
    const oldest = cache.keys().next()
    if (!oldest.done) cache.delete(oldest.value)
  }

  return (arg) => {
    const k = key(arg)
    const result = cache.has(k) ? cache.get(k)! : fn(arg)
    cache.delete(k)
    if (cache.size >= size) evictOldest()
    cache.set(k, result)
    return result
  }
}
