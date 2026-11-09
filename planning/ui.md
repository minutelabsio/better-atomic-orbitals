# PLAN: User interface — orbital picker, meaning readout, transitions

**Status:** design — nothing implemented. Decisions below came out of a design
discussion (2026-11-09); open questions are listed at the end.
**Related:** `planning/hydrogen-orbitals.md` (physics + sampling), `src/App.svelte`
(current prototype controls).

## Audience & goal

College students meeting atomic orbitals for the first time, and the high-school /
college / university teachers who show it to them. The UI should make it intuitive
what each quantum number *means* — tied to something visible in the cloud — and
connect them to spdf notation. The visualization stays the hero; the UI supports it.

## Framing (decided)

- **Complex orbitals only** (∝ eⁱᵐᵠ). No "real" px/dxy orbitals. It's understood
  this is a specific interpretation; m=±1 shows as a swirling torus, not a dumbbell.
- **m is the swirl.** Sign = direction, |m| = speed (ω = m/ρ²). m=0 is static. +m
  and −m have identical shape, opposite spin. The UI leans into this — it's the one
  quantum number you can literally watch.

## What each number means (copy + readout)

| Number | Plain name | What's visible in the cloud |
|---|---|---|
| **n** | size / energy shell | overall extent; n−1 total nodes |
| **l** → s p d f g h | shape | l angular nodes (empty cones/planes) |
| **m** | swirl | rotation direction and speed about the axis |
| derived | radial nodes = n−l−1 | empty spherical shells (best seen with cutaway) |

A small readout for the current orbital: big `3d` label, m with a swirl glyph, and a
**node counter** ("2 radial · 1 angular") that points at the gaps in the cloud.

## Orbital picker: swipeable n-triangles (decided)

A **bottom sheet** that slides up. Each page is one shell n, swiped horizontally, so
it reads as scrolling between triangles.

For a given n the allowed (l, m) form a triangle: row l (labelled s, p, d, f…) has
the m values. Constraints l < n and |m| ≤ l are never stated — the cells that don't
exist aren't there. Each n adds one row; shell n has n² states (2n² with spin).

```
  n:  ‹  ①  ②  [③]  ④  ⑤  ⑥  ›        swipe between shells

  s  l=0    [3s]
  p  l=1    [ 0] [ 1]
  d  l=2    [ 0] [ 1] [ 2]              half triangle: |m| only
                                         swirl toggle:  ↺ / ↻
```

### Half triangle + swirl toggle (decided)

Show only **m ≥ 0** (a right triangle, m=0 along the left edge = the static
column, swirl increasing to the right). Width at n=6 drops from 11 to 6 cells
(36 → 21 cells). The **sign of m** comes from a **swirl-direction toggle** (↺ / ↻)
beside the triangle. No fold animation. Exact toggle form still to design (a
segmented control, or tap-the-selected-cell-again to flip, or both). The toggle
does nothing visible / is disabled while m=0 is selected.

Ideas parked for later: a full-triangle layout on wide screens; an "all shells"
zoomed-out overview (n rows × l columns staircase), which is a side view of
the stacked triangles and shows how radial nodes become angular nodes across a row.

## Deep linking (decided)

Every orbital is addressable by URL and the URL tracks the current selection, so
teachers can share or bookmark a specific orbital. Proposed form: `?o=3d+1`,
`?o=2p-1`, `?o=1s` (n, letter, signed m; m omitted for s). The sign is always
explicit in the link even though the picker shows |m| + toggle. Invalid links fall
back to a default orbital.

## Transitions between orbitals (decided: yes, via intween)

Changing orbital should **morph** the cloud, not pop.

- The sampler draws independent uniforms per particle (r and θ by inverse CDF, φ
  uniform — `src/lib/orbital/sampleOrbital.ts`). If each particle **keeps its
  random numbers** (u_r, u_θ, φ) across a reseed, its new position is just the new
  inverse CDFs evaluated at the same u's. That gives a natural one-to-one particle
  correspondence: radial nodes open up as particles part around them.
- Tween **position and angular velocity** together with **intween** so the swirl
  speeds up, slows, or reverses smoothly (m → −m reverses the spin in place).
- Needs careful thought:
  - What to tween: (r, θ) and m, deriving ω = m/ρ² each frame, vs. tweening ρ, y
    and ω directly. Tweening m keeps the motion physically consistent during the
    transition.
  - φ keeps advancing during the tween; make sure it doesn't jump.
  - The per-orbital fit scale (99th percentile → `clusterRadius`) changes between
    orbitals; tween it too or the cloud will jump in size.
  - Where the tween state lives (CPU in `SphereGrid.update`, per frame) and the
    cost at ~50k particles.
  - `SphereGrid.reseed` currently redraws with fresh `Math.random()`; it needs to
    keep the stored uniforms.

## Thumbnails: pre-rendered video (decided)

Picker cells show small looping animations of each orbital, **pre-rendered offline**
and shipped as assets — no live 3D in the menu.

- **Only m ≥ 0 need rendering.** The cloud is axisymmetric about the vertical spin
  axis, so mirroring a side-view clip horizontally (`transform: scaleX(-1)`)
  reverses the swirl, which gives −m. (The key light mirrors too, which is likely
  invisible at thumbnail size.) n ≤ 6 → 56 clips. m=0 clips are static, so they
  can be stills.
- **Seamless loops:** ω = m/ρ² varies per particle, so the cloud never repeats
  exactly. For the thumbnail render, quantize each particle's ω to the nearest
  2πk/T so every particle makes whole turns in the loop length T.
- **Decoding on mobile:** many simultaneous `<video>` elements is heavy, especially
  on iOS. Preferred: **one video per n** with all of that triangle's cells
  laid out in a single frame, cropped per cell with CSS: one decoder per page, cells
  in sync. Fallback: play only the visible page's clips (IntersectionObserver) with
  poster frames. Inline autoplay needs `muted playsinline`.
- **Pipeline:** drive the app itself in a headless browser, step frames
  deterministically, encode with ffmpeg (WebM/MP4). Same renderer and camera angle as
  the main view, so a thumbnail matches what you get on tap. Render onto the
  menu's background colour (video alpha is unreliable across browsers, Safari
  especially). Slow software WebGL in the sandbox is fine for an offline job.

## Dev / debug view (decided)

All rendering knobs in today's `App.svelte` — LUT, GI strategy, sphere count,
resolution, blend, samples, radius/variation, randomize, indirect bounce, colours,
cutaway feather — move behind a dev/debug view (e.g. `?debug` or a hidden
shortcut). The student/teacher UI shows only the picker, the readout, and a few
teaching toggles (e.g. cutaway, speed).

## Open questions

- **Cutaway in thumbnails?** It shows radial nodes (a big part of what n means), and
  without it 2s/3s/4s look nearly alike at small size, but it makes the thumbnails
  look less like the plain orbital shapes. Undecided.
- **Size honesty (deferred):** every orbital is currently scaled to the same frame
  size, so n's "size" meaning isn't visible. Options: scale bar in Bohr radii, ghost
  1s reference, true-scale toggle.
- Swirl toggle form (segmented control vs tap-again vs both).
- Which teaching toggles stay in the main UI (cutaway? speed?).
- Classroom/projector considerations beyond deep links.
