import { describe, expect, it } from 'vitest'
import { DEFAULT_ORBITAL, orbitalFromParam } from './orbitalParam'

describe('orbitalFromParam', () => {
  it('reads a valid orbital', () => {
    expect(orbitalFromParam('3d-2')).toEqual({ n: 3, l: 2, m: -2 })
  })

  it('falls back to the default when missing, invalid or out of range', () => {
    for (const text of [null, '', '2d', '7s']) {
      expect(orbitalFromParam(text)).toEqual(DEFAULT_ORBITAL)
    }
  })
})
