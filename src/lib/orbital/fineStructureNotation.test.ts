import { describe, expect, it } from 'vitest'
import { allFineStructureStates } from './fineStructureCatalog.js'
import {
  formatFineStructureNotation,
  parseFineStructureNotation,
} from './fineStructureNotation.js'

describe('fineStructureNotation', () => {
  it('writes j and m_j as fractions', () => {
    expect(formatFineStructureNotation({ n: 2, l: 1, j: 1.5, mj: 0.5 })).toBe(
      '2p3/2m1/2',
    )
    expect(formatFineStructureNotation({ n: 1, l: 0, j: 0.5, mj: -0.5 })).toBe(
      '1s1/2m-1/2',
    )
  })

  it('round-trips every state up to n = 6', () => {
    for (const state of allFineStructureStates(6)) {
      expect(
        parseFineStructureNotation(formatFineStructureNotation(state)),
      ).toEqual(state)
    }
  })

  it('rejects malformed or impossible states', () => {
    for (const bad of [
      '',
      '2p1',
      '2p3/2',
      '2p3/2m3',
      '1s3/2m1/2',
      '2p5/2m1/2',
      '2p1/2m3/2',
      '2p2/2m0/2',
      '1p1/2m1/2',
      '3d3/2m+1/2',
    ]) {
      expect(parseFineStructureNotation(bad)).toBeUndefined()
    }
  })
})
