import type { FineStructureNumbers } from './fineStructure.js'

/** One spin component of a fine-structure spinor: amplitude · Y_l^m. */
export interface SpinorComponent {
  /** orbital magnetic number of this component (may exceed l, with amplitude 0) */
  readonly m: number
  /** Clebsch–Gordan coefficient ⟨l m; ½ ±½ | j m_j⟩, signed */
  readonly amplitude: number
}

export interface Spinor {
  readonly up: SpinorComponent
  readonly down: SpinorComponent
}

/**
 * The angular spinor of |l j m_j⟩ as two ordinary spherical harmonics,
 * Condon–Shortley phases (Sakurai & Napolitano eq. 3.8.64; Griffiths
 * table 4.8):
 *
 *   j = l + ½:   √((l + m_j + ½)/(2l+1)) Y_l^(m_j-½) ↑ + √((l - m_j + ½)/(2l+1)) Y_l^(m_j+½) ↓
 *   j = l - ½:  -√((l - m_j + ½)/(2l+1)) Y_l^(m_j-½) ↑ + √((l + m_j + ½)/(2l+1)) Y_l^(m_j+½) ↓
 *
 * The radial function R_nl is shared by both components, so n doesn't enter.
 * In the stretched states m_j = ±(l + ½) one amplitude is 0 and the state is
 * the plain orbital |n l ±l⟩ with spin up or down.
 */
export function spinorComponents({
  l,
  j,
  mj,
}: Pick<FineStructureNumbers, 'l' | 'j' | 'mj'>): Spinor {
  const width = 2 * l + 1
  const plus = Math.sqrt((l + mj + 0.5) / width)
  const minus = Math.sqrt((l - mj + 0.5) / width)
  const isAligned = j > l
  return {
    up: { m: mj - 0.5, amplitude: isAligned ? plus : -minus },
    down: { m: mj + 0.5, amplitude: isAligned ? minus : plus },
  }
}
