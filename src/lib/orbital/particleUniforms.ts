const FULL_TURN = 2 * Math.PI

/**
 * The per-particle random numbers that pick where a particle sits in *any*
 * orbital. A particle keeps these for its whole life: its position in orbital
 * (n,l,m) is the inverse CDFs of that orbital evaluated at the same uniforms.
 * That gives every particle a natural counterpart in every orbital, which is
 * what makes a morph between orbitals possible (see `orbitalShape.ts`).
 */
export interface ParticleUniforms {
  /** quantile of the radial marginal, [0,1) */
  uR: Float32Array
  /** quantile of the polar marginal, [0,1) */
  uPolar: Float32Array
  /** initial azimuth about the spin axis, [0, 2π) */
  phi: Float32Array
}

export function drawParticleUniforms(
  count: number,
  rng: () => number = Math.random,
): ParticleUniforms {
  const draw = (scale = 1) =>
    Float32Array.from({ length: count }, () => rng() * scale)
  return { uR: draw(), uPolar: draw(), phi: draw(FULL_TURN) }
}
