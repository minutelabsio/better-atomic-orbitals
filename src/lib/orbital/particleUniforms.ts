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
  const uR = new Float32Array(count)
  const uPolar = new Float32Array(count)
  const phi = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    uR[i] = rng()
    uPolar[i] = rng()
    phi[i] = rng() * 2 * Math.PI
  }
  return { uR, uPolar, phi }
}
