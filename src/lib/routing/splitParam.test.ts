import { describe, expect, it } from 'vitest'
import { splitFromParam, splitToParam } from './splitParam'

describe('splitFromParam', () => {
  it('is on only for 1', () => {
    expect(splitFromParam('1')).toBe(true)
    for (const text of [null, '', '0', 'true', 'yes']) {
      expect(splitFromParam(text)).toBe(false)
    }
  })
})

describe('splitToParam', () => {
  it('round-trips, leaving off out of the URL', () => {
    expect(splitToParam(false)).toBeNull()
    for (const split of [true, false]) {
      expect(splitFromParam(splitToParam(split))).toBe(split)
    }
  })
})
