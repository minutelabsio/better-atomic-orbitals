import type { OrbitalState } from '../../orbital/orbitalTransition.js'
import type { ParticleUniforms } from '../../orbital/particleUniforms.js'
import type { ParticleField } from '../../orbital/shapeMix.js'
import {
  createSpinFieldResolver,
  type SpinField,
} from '../../orbital/spinFieldOfState.js'
import { createGridBuilder } from './gridBuilder.js'
import { gridGeometry } from './gridGeometry.js'
import {
  type PackedFloatTexture,
  packedFloatTexture,
} from './packedFloatTexture.js'
import { createParticleSwarm, type SphereStyle } from './particleSwarm.js'

export interface SphereGridOptions {
  count: number
  /** cells per axis */
  gridRes?: number
  /** the cloud's bulk radius; the grid domain gets a margin beyond it */
  clusterRadius?: number
}

export interface SphereGridFrame extends SphereStyle {
  /** visual speed scale applied to each particle's angular velocity */
  speedScale: number
  /** which spin goes into `sphereSpin` */
  spinField: SpinField
}

export interface SphereGrid {
  readonly uniforms: ParticleUniforms
  /** sphere centres + radii, one texel per sphere */
  readonly spheres: PackedFloatTexture
  /** each sphere's spin along the axis (+1 up … -1 down), same layout as `spheres` */
  readonly sphereSpin: PackedFloatTexture
  /** uniforms the ray-tracing shaders read the grid from; values update in place */
  readonly shaderUniforms: Record<string, { value: unknown }>
  setOrbitalState(state: OrbitalState): void
  /** advance the spin one step and rebuild the grid */
  update(frame: SphereGridFrame): void
  dispose(): void
}

// generous fixed margin so live radius changes stay within the domain
const BOUND_MARGIN = 0.1

/**
 * Orbiting spheres plus the uniform grid a fragment-shader ray tracer
 * traverses to find them, rebuilt every frame. Spheres in the cut quadrant
 * are left out of the grid (and feathered), so rays cross the opening cheaply.
 */
export function createSphereGrid({
  count,
  gridRes = 32,
  clusterRadius = 1.4,
}: SphereGridOptions): SphereGrid {
  const geometry = gridGeometry({
    gridRes,
    boundRadius: clusterRadius + BOUND_MARGIN,
  })
  const swarm = createParticleSwarm({ count })
  const spheres = packedFloatTexture(count, 4)
  const sphereSpin = packedFloatTexture(count, 1)
  const spinFieldOf = createSpinFieldResolver({
    count,
    uSpin: swarm.uniforms.uSpin,
  })
  const grid = createGridBuilder({ geometry, sphereCount: count })
  const shaderUniforms = {
    uSpherePos: { value: spheres.texture },
    uSpherePosTexW: { value: spheres.width },
    uSphereTexH: { value: spheres.height },
    uCellRange: { value: grid.cellRange.texture },
    uCellRangeTexW: { value: grid.cellRange.width },
    uIndexList: { value: grid.indexList.texture },
    uIndexListTexW: { value: grid.indexList.width },
    uGridRes: { value: geometry.gridRes },
    uBoundMin: { value: geometry.boundMin },
    uCellSize: { value: geometry.cellSize },
    uSphereSpin: { value: sphereSpin.texture },
    /** false while the state has no spin (a plain orbital, spin off) */
    uSpinDefined: { value: false },
  }
  let shownSpin: ParticleField | undefined
  let orbitalState: OrbitalState | undefined

  // a spin field only changes with the state or the choice, so upload it only then
  const showSpin = (spin: ParticleField | undefined) => {
    if (spin === shownSpin) return
    shownSpin = spin
    shaderUniforms.uSpinDefined.value = spin !== undefined
    if (!spin) return
    sphereSpin.data.set(spin)
    sphereSpin.texture.needsUpdate = true
  }

  return {
    uniforms: swarm.uniforms,
    spheres,
    sphereSpin,
    shaderUniforms,
    setOrbitalState(state) {
      orbitalState = state
      swarm.setOrbitalState(state)
    },
    update({ speedScale, spinField, ...style }) {
      showSpin(orbitalState && spinFieldOf(orbitalState, spinField))
      swarm.advance(speedScale)
      swarm.writeSpheres(spheres.data, style)
      spheres.texture.needsUpdate = true
      grid.build(spheres.data, { cutaway: style.cutaway ?? false })
    },
    dispose() {
      spheres.texture.dispose()
      sphereSpin.texture.dispose()
      grid.dispose()
    },
  }
}
