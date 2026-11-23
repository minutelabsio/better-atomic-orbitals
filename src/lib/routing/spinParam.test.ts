import { describe, expect, it } from 'vitest'
import { DEFAULT_SPIN, spinFromParam, spinToParam } from './spinParam'

describe('spinFromParam', () => {
  it('reads up, down and both', () => {
    expect(spinFromParam('up')).toBe('up')
    expect(spinFromParam('down')).toBe('down')
    expect(spinFromParam('both')).toBe('both')
  })

  it('falls back to off when missing or invalid', () => {
    for (const text of [null, '', 'sideways', 'UP', 'Both']) {
      expect(spinFromParam(text)).toBe(DEFAULT_SPIN)
    }
  })
})

describe('spinToParam', () => {
  it('round-trips through spinFromParam, leaving off out of the URL', () => {
    expect(spinToParam('off')).toBeNull()
    for (const spin of ['off', 'both', 'up', 'down'] as const) {
      expect(spinFromParam(spinToParam(spin))).toBe(spin)
    }
  })
})
