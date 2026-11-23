import { describe, expect, it } from 'vitest'
import {
  defaultSphereColoring,
  isSphereColoring,
  spinFieldOf,
} from './sphereColoring'

describe('defaultSphereColoring', () => {
  it('colors fine-structure states by measured spin and plain orbitals plainly', () => {
    const fine = { n: 2, l: 1, j: 0.5, mj: 0.5 }
    expect(defaultSphereColoring({ orbital: fine, spin: 'off' })).toBe(
      'measured',
    )
    const plain = { n: 2, l: 1, m: 1 }
    for (const spin of ['off', 'up', 'down'] as const) {
      expect(defaultSphereColoring({ orbital: plain, spin })).toBe('plain')
    }
  })

  it('colors a plain orbital with spin both by each sphere’s spin', () => {
    expect(
      defaultSphereColoring({ orbital: { n: 1, l: 0, m: 0 }, spin: 'both' }),
    ).toBe('measured')
  })
})

describe('isSphereColoring', () => {
  it('accepts only the known colorings', () => {
    for (const text of ['measured', 'average', 'plain']) {
      expect(isSphereColoring(text)).toBe(true)
    }
    for (const text of ['spin', 'Measured', '']) {
      expect(isSphereColoring(text)).toBe(false)
    }
  })
})

describe('spinFieldOf', () => {
  it('maps each coloring to the spin it shows', () => {
    expect(spinFieldOf('measured')).toBe('measured')
    expect(spinFieldOf('average')).toBe('average')
    expect(spinFieldOf('plain')).toBeUndefined()
  })
})
