import { describe, expect, it } from 'vitest'
import { defaultSphereColoring, isSphereColoring } from './sphereColoring'

describe('defaultSphereColoring', () => {
  it('colors fine-structure states by spin and plain orbitals plainly', () => {
    expect(defaultSphereColoring({ n: 2, l: 1, j: 0.5, mj: 0.5 })).toBe('spin')
    expect(defaultSphereColoring({ n: 2, l: 1, m: 1 })).toBe('plain')
  })
})

describe('isSphereColoring', () => {
  it('accepts only the known colorings', () => {
    expect(isSphereColoring('spin')).toBe(true)
    expect(isSphereColoring('plain')).toBe(true)
    expect(isSphereColoring('SPIN')).toBe(false)
    expect(isSphereColoring('')).toBe(false)
  })
})
