import { describe, expect, it } from 'vitest'
import {
  formatHydrogenStateNotation,
  parseHydrogenStateNotation,
} from './hydrogenStateNotation.js'

describe('hydrogenStateNotation', () => {
  it('reads and writes both kinds of state', () => {
    for (const text of ['3d-1', '1s', '2p3/2m-3/2', '3d5/2m1/2']) {
      const state = parseHydrogenStateNotation(text)
      expect(state).toBeDefined()
      expect(formatHydrogenStateNotation(state!)).toBe(text)
    }
  })

  it('rejects what neither notation accepts', () => {
    expect(parseHydrogenStateNotation('2p3/2')).toBeUndefined()
    expect(parseHydrogenStateNotation('2p2')).toBeUndefined()
  })
})
