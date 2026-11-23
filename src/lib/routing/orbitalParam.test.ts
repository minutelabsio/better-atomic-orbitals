import { describe, expect, it } from 'vitest'
import { DEFAULT_ORBITAL, orbitalFromParam } from './orbitalParam'

describe('orbitalFromParam', () => {
  it('reads a valid orbital', () => {
    expect(orbitalFromParam('3d-2')).toEqual({ n: 3, l: 2, m: -2 })
  })

  it('reads a fine-structure state', () => {
    expect(orbitalFromParam('2p1/2m-1/2')).toEqual({
      n: 2,
      l: 1,
      j: 0.5,
      mj: -0.5,
    })
  })

  it('falls back to the default when missing, invalid or out of range', () => {
    for (const text of [null, '', '2d', '7s', '7s1/2m1/2', '2p3/2m5/2']) {
      expect(orbitalFromParam(text)).toEqual(DEFAULT_ORBITAL)
    }
  })
})
