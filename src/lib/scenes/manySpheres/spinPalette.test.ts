import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { SPIN_PALETTE, spinPaletteMatrix } from './spinPalette.js'

describe('spinPaletteMatrix', () => {
  it('holds up, sideways, down as linear columns', () => {
    // Matrix3.elements is column-major
    const columns = spinPaletteMatrix().elements
    const stops = [SPIN_PALETTE.up, SPIN_PALETTE.sideways, SPIN_PALETTE.down]
    stops.forEach((hex, column) => {
      const { r, g, b } = new THREE.Color(hex)
      expect(columns.slice(3 * column, 3 * column + 3)).toEqual([r, g, b])
    })
  })
})
