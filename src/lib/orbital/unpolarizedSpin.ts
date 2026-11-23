import { SPIN_DOWN, SPIN_UP } from './spinCurrent.js'

const UP_PROBABILITY = 1 / 2

/**
 * Each particle's spin in an unpolarized mixture (the spin setting "both"):
 * up (+1) when its fixed uniform `uSpin` is below ½, else down (-1).
 *
 * |n l m, ↑⟩ and |n l m, ↓⟩ have the same density, so the label doesn't depend
 * on position: positions stay as they are and only the swirl and color follow
 * the label. Read as an ensemble of atoms with random spins (an unpolarized
 * gas): each sphere is a different atom's electron, with a definite spin.
 */
export function unpolarizedSpinLabels(uSpin: ArrayLike<number>): Float32Array {
  return Float32Array.from(uSpin, (u) =>
    u < UP_PROBABILITY ? SPIN_UP : SPIN_DOWN,
  )
}
