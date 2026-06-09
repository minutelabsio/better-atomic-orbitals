# TODO: Motion-vector reprojection for the Many Spheres GI denoiser

**Status:** not started
**Scene:** `src/lib/scenes/manySpheres/`

## Problem

The GI denoiser (`manySpheres.frag.glsl`) uses a temporal exponential moving
average: `result = mix(history, sample, uBlend)`, reading history at the *same
screen pixel* (`uv = vNDC*0.5+0.5`). That assumes the surface under a pixel is the
same as last frame. But the spheres orbit every frame, so a pixel's history
belongs to a *different* world point → the smear we see as motion blur (worst for
the fast inner spheres, since `speed ∝ 1/(r+ε)²`).

Current stop-gaps: the `blend` slider (more blur ↔ more noise) and the `randomize`
toggle (deterministic, noise-free but biased bounce). Neither removes the blur
while keeping the denoise.

## Goal

Reproject history per pixel (TAA / SVGF style): for each primary hit, find where
that surface point was on screen *last* frame and sample history *there*. This
keeps temporal denoising while tracking motion → blur gone, noise still averaged.

## Key simplification for this scene

Spheres only **translate** (orbital `makeTranslation`, no spin). So a surface
point's previous world position is just the hit point shifted by the sphere's
center delta:

```
prevHitWorld = hit + (prevCenter - center)
```

(If spheres ever get a spin, this must rotate the local offset instead.)

## Plan / checklist

- [ ] **Previous sphere centers.** Add a `uSpherePosPrev` data texture holding last
      frame's centers. In `sphereGrid.ts` / `ManySpheres.svelte`, ping-pong the
      position buffer so prev holds last frame before `update()` overwrites it.
      (Alt: compute `prevCenter` analytically on the GPU from `theta - speed` by
      uploading per-sphere `speed`; storing prev positions is simpler and survives
      count changes.)
- [ ] **Return hit sphere index** from `traceGrid` (add `out int hitIndex`) so the
      shader can fetch that sphere's prev center.
- [ ] **Previous view-projection uniform.** `ManySpheres.svelte` keeps last frame's
      `viewProj`; pass as `uPrevViewProj`. Project `prevHitWorld` → previous NDC →
      `prevUV`.
- [ ] **Sample history at `prevUV`** instead of the current uv.
- [ ] **Disocclusion / validity rejection.** If `prevUV` is offscreen, or the thing
      that was there last frame is a different surface, history is invalid → use the
      current sample only (per-pixel blend = 1). For a robust check, write an aux
      history buffer with a hit id (sphere index) and/or linear depth, and reject
      when it disagrees beyond a tolerance.
- [ ] **Per-pixel blend.** Replace the global `uBlend` reset logic with a value
      computed in-shader: low blend on valid reprojected history, 1.0 on invalid.
- [ ] Once reprojection works, **drop the camera-move reset hack** in
      `ManySpheres.svelte` (lines ~126-134) — `uPrevViewProj` already accounts for
      camera motion.

## Stretch

- [ ] Neighborhood color clamp (clamp history to the 3×3 current-sample AABB) to
      kill ghosting on fast disocclusion — the core idea behind TAA/SVGF.
- [ ] Spatial à-trous / edge-aware blur pass for a fuller SVGF denoiser if temporal
      alone is too noisy at low sample counts.

## References

- TAA reprojection (history sampling via motion vectors).
- SVGF: "Spatiotemporal Variance-Guided Filtering" (Schied et al. 2017) — the
  reference design for real-time path-traced denoising.
