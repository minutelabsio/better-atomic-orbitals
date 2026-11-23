import { describe, expect, it } from 'vitest'
import { SPHERE_COLORINGS } from '../scenes/manySpheres/sphereColoring'
import { coloringFromParam, coloringToParam } from './colorParam'

const fine = { n: 2, l: 1, j: 0.5, mj: 0.5 }
const plain = { n: 2, l: 1, m: 1 }

describe('coloringFromParam', () => {
  it('reads every coloring whatever the state', () => {
    for (const state of [fine, plain]) {
      for (const coloring of SPHERE_COLORINGS) {
        expect(coloringFromParam(coloring, state)).toBe(coloring)
      }
    }
  })

  it('falls back to the state’s default when missing or invalid', () => {
    for (const text of [null, '', 'rainbow', 'spin', 'Measured']) {
      expect(coloringFromParam(text, fine)).toBe('measured')
      expect(coloringFromParam(text, plain)).toBe('plain')
    }
  })
})

describe('coloringToParam', () => {
  it('leaves the state’s default out of the URL', () => {
    expect(coloringToParam('measured', fine)).toBeNull()
    expect(coloringToParam('plain', plain)).toBeNull()
    expect(coloringToParam('average', fine)).toBe('average')
    expect(coloringToParam('plain', fine)).toBe('plain')
    expect(coloringToParam('measured', plain)).toBe('measured')
  })

  it('round-trips through coloringFromParam', () => {
    for (const state of [fine, plain]) {
      for (const coloring of SPHERE_COLORINGS) {
        expect(coloringFromParam(coloringToParam(coloring, state), state)).toBe(
          coloring,
        )
      }
    }
  })
})
