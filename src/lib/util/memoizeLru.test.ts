import { describe, expect, it, vi } from 'vitest'
import { memoizeLru } from './memoizeLru.js'

const memoizedDouble = (size: number) => {
  const double = vi.fn((x: number) => ({ value: 2 * x }))
  return { double, memoized: memoizeLru(double, { size, key: String }) }
}

describe('memoizeLru', () => {
  it('returns the cached result for a repeated argument', () => {
    const { double, memoized } = memoizedDouble(2)
    expect(memoized(1)).toBe(memoized(1))
    expect(double).toHaveBeenCalledTimes(1)
  })

  it('evicts the least recently used entry', () => {
    const { double, memoized } = memoizedDouble(2)
    memoized(1)
    memoized(2)
    memoized(1) // 2 is now least recent
    memoized(3)
    memoized(1)
    expect(double).toHaveBeenCalledTimes(3)
    memoized(2)
    expect(double).toHaveBeenCalledTimes(4)
  })
})
