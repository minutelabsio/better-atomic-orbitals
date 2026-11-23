import { describe, expect, it } from 'vitest'
import {
  allFineStructureStates,
  fineStructureLabel,
} from './fineStructureCatalog.js'

describe('allFineStructureStates', () => {
  it('has 2n² states in shell n, like the |n l m⟩ orbitals with spin', () => {
    expect(allFineStructureStates(1)).toHaveLength(2)
    expect(allFineStructureStates(3)).toHaveLength(2 + 8 + 18)
  })

  it('labels with fractions and a signed m_j', () => {
    expect(fineStructureLabel({ n: 2, l: 1, j: 1.5, mj: -1.5 })).toBe(
      '2p3/2 mj=-3/2',
    )
    expect(fineStructureLabel({ n: 3, l: 2, j: 2.5, mj: 0.5 })).toBe(
      '3d5/2 mj=+1/2',
    )
  })
})
