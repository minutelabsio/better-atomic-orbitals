import { describe, expect, it } from 'vitest'
import { orbitalShape } from './orbitalShape.js'
import { type OrbitalState, OrbitalTransition } from './orbitalTransition.js'
import { drawParticleUniforms } from './particleUniforms.js'
import { evaluateShape, mixShapes, ShapeScratch } from './shapeMix.js'

/** small deterministic PRNG (mulberry32) */
function rng(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const N = 500
const uniforms = drawParticleUniforms(N, rng(1))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('orbitalShape', () => {
  it('maps the same uniforms to the same shape', () => {
    const a = orbitalShape(3, 1, 1, uniforms)
    const b = orbitalShape(3, 1, 1, uniforms)
    expect(a.r).toEqual(b.r)
    expect(a.polar).toEqual(b.polar)
  })

  it('keeps each particle at the same radial rank in every orbital', () => {
    const order = (arr: Float32Array) =>
      Array.from(arr.keys()).sort((i, j) => arr[i]! - arr[j]!)
    const byU = order(uniforms.uR)
    for (const [n, l] of [
      [1, 0],
      [3, 2],
      [4, 0],
    ] as const) {
      const r = orbitalShape(n, l, 0, uniforms).r
      // r is a monotone function of uR (ties only from the far-tail clamp)
      for (let k = 1; k < N; k++) {
        expect(r[byU[k]!]!).toBeGreaterThanOrEqual(r[byU[k - 1]!]!)
      }
    }
  })
})

describe('shape mixing', () => {
  const a = orbitalShape(2, 1, 0, uniforms)
  const b = orbitalShape(3, 2, 1, uniforms)
  const c = orbitalShape(1, 0, 0, uniforms)
  const scratch = new ShapeScratch(N)
  const outR = new Float32Array(N)
  const outP = new Float32Array(N)

  it('returns the endpoints at k = 0 and 1', () => {
    expect(mixShapes(a, b, 0)).toBe(a)
    expect(mixShapes(a, b, 1)).toBe(b)
  })

  it('lerps (r, polar) per particle', () => {
    evaluateShape(mixShapes(a, b, 0.25), outR, outP, scratch)
    for (let i = 0; i < N; i += 37) {
      expect(outR[i]).toBeCloseTo(a.r[i]! * 0.75 + b.r[i]! * 0.25, 5)
      expect(outP[i]).toBeCloseTo(a.polar[i]! * 0.75 + b.polar[i]! * 0.25, 5)
    }
  })

  it('evaluates nested mixes (a retargeted morph)', () => {
    const inner = mixShapes(a, b, 0.5)
    evaluateShape(mixShapes(inner, c, 0.5), outR, outP, scratch)
    for (let i = 0; i < N; i += 37) {
      const mid = (a.r[i]! + b.r[i]!) / 2
      expect(outR[i]).toBeCloseTo((mid + c.r[i]!) / 2, 5)
    }
  })
})

describe('OrbitalTransition (intween smoothen)', () => {
  it('emits the initial state, morphs, then lands exactly on the target', async () => {
    const states: OrbitalState[] = []
    const t = new OrbitalTransition(
      uniforms,
      { n: 2, l: 1, m: 1 },
      (s) => states.push(s),
      { duration: 120, easing: 'linear' },
    )
    expect(states).toHaveLength(1)
    expect(states[0]!.m).toBe(1)

    t.goTo(2, 1, -1)
    await sleep(60)
    const mid = states.at(-1)!
    expect(mid.shape.kind).toBe('mix')
    expect(mid.m).toBeGreaterThan(-1)
    expect(mid.m).toBeLessThan(1)

    await sleep(200)
    const end = states.at(-1)!
    expect(end.m).toBe(-1)
    expect(end.shape.kind).toBe('orbital')
    if (end.shape.kind === 'orbital') {
      expect([end.shape.n, end.shape.l, end.shape.m]).toEqual([2, 1, -1])
    }
    t.dispose()
  })

  it('retargets mid-flight without jumping', async () => {
    const states: OrbitalState[] = []
    const t = new OrbitalTransition(
      uniforms,
      { n: 1, l: 0, m: 0 },
      (s) => states.push(s),
      { duration: 150, easing: 'linear' },
    )
    t.goTo(3, 2, 2)
    await sleep(60)
    expect(states.at(-1)!.m).toBeGreaterThan(0)
    t.goTo(3, 2, -2)
    await sleep(300)
    expect(states.at(-1)!.m).toBe(-2)
    // no frame-to-frame jump anywhere, including at the retarget (a full 0→2
    // or 2→−2 snap would show up as a step of 2+; ~16ms frames of a 150ms
    // morph move m by well under 1)
    let maxStep = 0
    for (let i = 1; i < states.length; i++) {
      maxStep = Math.max(maxStep, Math.abs(states[i]!.m - states[i - 1]!.m))
    }
    expect(maxStep).toBeLessThan(1)
    t.dispose()
  })
})
