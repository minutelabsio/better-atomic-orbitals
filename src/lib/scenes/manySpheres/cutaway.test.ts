import { describe, expect, it } from 'vitest'
import { cutawayFeatherScale, isInCutQuadrant } from './cutaway.js'

describe('cutaway', () => {
  it('cuts only the top-front quadrant', () => {
    expect(isInCutQuadrant(0.5, 0.5)).toBe(true)
    expect(isInCutQuadrant(0.5, -0.5)).toBe(false)
    expect(isInCutQuadrant(-0.5, 0.5)).toBe(false)
  })

  it('feathers from 0 inside the cut to 1 beyond the band', () => {
    expect(cutawayFeatherScale(0.5, 0.5, 0.1)).toBe(0)
    expect(cutawayFeatherScale(-0.05, 0.5, 0.1)).toBeCloseTo(0.5)
    expect(cutawayFeatherScale(-0.5, -0.5, 0.1)).toBe(1)
  })

  it('does not feather with a zero band', () => {
    expect(cutawayFeatherScale(0.5, 0.5, 0)).toBe(1)
  })
})
