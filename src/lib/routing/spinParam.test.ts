import { describe, expect, it } from 'vitest'
import { DEFAULT_SPIN, spinFromParam, spinToParam } from './spinParam'

describe('spinFromParam', () => {
  it('reads up and down', () => {
    expect(spinFromParam('up')).toBe('up')
    expect(spinFromParam('down')).toBe('down')
  })

  it('falls back to off when missing or invalid', () => {
    for (const text of [null, '', 'sideways', 'UP']) {
      expect(spinFromParam(text)).toBe(DEFAULT_SPIN)
    }
  })
})

describe('spinToParam', () => {
  it('round-trips through spinFromParam, leaving off out of the URL', () => {
    expect(spinToParam('off')).toBeNull()
    for (const spin of ['off', 'up', 'down'] as const) {
      expect(spinFromParam(spinToParam(spin))).toBe(spin)
    }
  })
})
