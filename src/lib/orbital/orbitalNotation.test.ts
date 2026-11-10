import { describe, expect, it } from 'vitest'
import { allOrbitals } from './orbitalCatalog'
import { formatOrbitalNotation, parseOrbitalNotation } from './orbitalNotation'

describe('orbitalNotation', () => {
  it('formats signed m, omitted for s', () => {
    expect(formatOrbitalNotation({ n: 1, l: 0, m: 0 })).toBe('1s')
    expect(formatOrbitalNotation({ n: 3, l: 2, m: 1 })).toBe('3d1')
    expect(formatOrbitalNotation({ n: 2, l: 1, m: -1 })).toBe('2p-1')
    expect(formatOrbitalNotation({ n: 3, l: 2, m: 0 })).toBe('3d0')
  })

  it('round-trips every orbital up to n = 6', () => {
    for (const o of allOrbitals(6)) {
      expect(parseOrbitalNotation(formatOrbitalNotation(o))).toEqual(o)
    }
  })

  it('is case-insensitive', () => {
    expect(parseOrbitalNotation('3D-2')).toEqual({ n: 3, l: 2, m: -2 })
  })

  it('rejects malformed or impossible orbitals', () => {
    for (const bad of [
      '',
      'x',
      '2d1',
      '1p0',
      '2p2',
      '0s',
      '3q1',
      '2p',
      '1s1',
      '3d+1',
    ]) {
      expect(parseOrbitalNotation(bad)).toBeUndefined()
    }
  })
})
