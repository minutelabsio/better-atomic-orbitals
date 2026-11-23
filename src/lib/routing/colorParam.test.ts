import { describe, expect, it } from 'vitest'
import { coloringFromParam, coloringToParam } from './colorParam'

const fine = { n: 2, l: 1, j: 0.5, mj: 0.5 }
const plain = { n: 2, l: 1, m: 1 }

describe('coloringFromParam', () => {
  it('reads spin and plain whatever the state', () => {
    for (const state of [fine, plain]) {
      expect(coloringFromParam('spin', state)).toBe('spin')
      expect(coloringFromParam('plain', state)).toBe('plain')
    }
  })

  it('falls back to the state’s default when missing or invalid', () => {
    for (const text of [null, '', 'rainbow', 'Spin']) {
      expect(coloringFromParam(text, fine)).toBe('spin')
      expect(coloringFromParam(text, plain)).toBe('plain')
    }
  })
})

describe('coloringToParam', () => {
  it('leaves the state’s default out of the URL', () => {
    expect(coloringToParam('spin', fine)).toBeNull()
    expect(coloringToParam('plain', plain)).toBeNull()
    expect(coloringToParam('plain', fine)).toBe('plain')
    expect(coloringToParam('spin', plain)).toBe('spin')
  })

  it('round-trips through coloringFromParam', () => {
    for (const state of [fine, plain]) {
      for (const coloring of ['spin', 'plain'] as const) {
        expect(coloringFromParam(coloringToParam(coloring, state), state)).toBe(
          coloring,
        )
      }
    }
  })
})
