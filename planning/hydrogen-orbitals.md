# TODO: Generate hydrogen-orbital point clouds analytically (replicate the video)

**Status:** not started — spec only
**Reference:** `reference/Animate Particles Spin Local.py` (the original Blender animator)
**Target look:** https://www.youtube.com/watch?v=W2Xb2GFK2yc

## Context

The video is a grid of **hydrogen atomic orbitals**: each is a cloud of points sampled
from the electron probability density |ψₙₗₘ|², and each point flows azimuthally at the
local quantum **probability-current** angular velocity (that's the "spin"). The Blender
`.py` is only the **animator** — it repositions/resizes pre-existing particles every
frame; the point positions came from CSVs exported from Mathematica.

**Decision: generate everything analytically in JS at init — no CSVs.** The positions
and per-particle angular velocity are fully determined by the equations, so MB-scale CSV
files are unnecessary and would freeze the orbital choice. The original **Mathematica
files are the source of truth** for the exact formulas/normalizations and for validation.

Our renderer (uniform grid + GI + accumulation in `src/lib/scenes/manySpheres/`) is
ready; only the **seeding** in `sphereGrid.ts` needs to change. The per-frame loop and
grid are untouched.

## Why our motion model already fits

`sphereGrid` stores `(radii [=ρ], yPos [=z], theta [=φ], speed)` and does `theta += speed`
each frame. The reference keeps a base point and rotates it about Z by
`rotation_rate · time · dphidt`. **Same model**, with an axis relabel: their spin axis Z
→ our Y. So ρ (cylindrical radius) = our `radii`, their z = our `yPos`, φ about Z = our
`theta` about Y, and `speed` = `rotation_rate · dphidt`.

Key fact that makes this work: for a **complex** orbital (∝ eⁱᵐᵠ), |ψ|² is independent of
φ — the cloud is axially symmetric about the spin axis, so rigidly flowing each point in
φ leaves the distribution invariant. The shape lives in (r, θ); the motion lives in φ.

## The model to implement

Coordinates (our axes): spin axis = **Y**. For a point (x,y,z):
`ρ = sqrt(x²+z²)`, `r = sqrt(x²+y²+z²)`, `u = cosθ = y/r`.

### 1. Distribution — sample from |ψₙₗₘ(r,θ)|²

ψₙₗₘ = Rₙₗ(r)·Θₗᵐ(θ)·eⁱᵐᵠ, with (atomic units, a₀=1):
- Radial: `Rₙₗ(r) ∝ (2r/n)^l · e^(−r/n) · L_{n−l−1}^{2l+1}(2r/n)` (generalized Laguerre).
- Angular: `Θₗᵐ(θ) ∝ P_l^m(cosθ)` (associated Legendre).

**Confirmed by the Mathematica generator** (`reference/Bohmian Hydrogen generate points
GOOD v2.nb`, lines 64–150): it draws three **independent 1-D** samples, not a joint 2-D —
which is simpler than rejection sampling:
- `θ` ~ `ProbabilityDistribution[ |Y_lm(θ)|² · sinθ, {θ,0,π} ]`  (the `2π·conj(Y)·Y` is the
  φ-integrated angular density; `sinθ` is the volume element).
- `r` ~ `ProbabilityDistribution[ |Rₙₗ(r)|² · r², {r,0,100} ]`, with the radial density
  `∝ 4^(1+l) · e^(−2r/n) · n^(−2(2+l)) · r^(2l) · LaguerreL[n−l−1, 1+2l, 2r/n]²`.
- `φ` ~ **uniform [0,2π)**.

Then `x = r·sinθ·cosφ`, `y = r·sinθ·sinφ`, `z = r·cosθ`. In JS: sample each 1-D marginal
by inverse-CDF (tabulate the density on a grid, build a CDF, invert) or rejection — either
is fine and one-time at init. `numpoints = 500000` per orbital in the notebook (we can use
far fewer). Normalization constants are irrelevant for sampling — only the shape matters.

### 2. Motion — per-particle angular velocity ω ∝ m/ρ²

**The authoritative formula is simple.** The GOOD notebook (lines 236–253) rotates each
point about the spin axis by `angle = K · m · t / (x² + y²)`, i.e.

```
ω = K · m / ρ²          # ρ² = cylindrical radius² about the spin axis; notebook K = 50
```

In our axes (spin axis = Y): `ρ² = x² + z²`, so per-particle
`speed = K · m / (x² + z²)`, computed **once** at init and stored. This is the Bohmian /
probability-current velocity of a stationary complex eigenstate `∝ eⁱᵐᵠ` (ω = m/ρ² in
atomic units; K is just a visual speed constant). The notebook comment explicitly calls
this the *"corrected"* form, *"removing a sqrt from the denominator"* — so it is ρ², not ρ.

Notes:
- `m = 0` ⇒ ω = 0 (s-orbitals and m=0 states are static — correct: no current).
- ρ→0 blows up, but for m≠0 the density vanishes on the axis (`|Y_lm|→0`), so almost no
  particles sit there; still, add a small epsilon or cap ω for robustness.
- **Ignore the `dphidt` Laguerre/Legendre formula in `Animate Particles Spin Local.py`** —
  that was a different/older "spin local" experiment. The video used ω = m/ρ².

### 3. Size — `size ∝ ⟨r⟩^points_exponent`

`⟨r⟩ₙₗ = (3n² − l(l+1))/2` (QM mean radius, Bohr radii). Script (line 140/144):
`size = 1.5·auto_scale / vol_max · ((3n² − l(l+1))/2)^e`, `vol_max = (3·nmax²/2)^e`,
`points_exponent e = 0.4`. Constant per orbital (n,l) — only matters when rendering
multiple orbitals of different sizes; keeps point density visually uniform. Maps onto our
`sphereRadius`/auto-scale.

### 4. Color — hue per shell n

Script (lines 45–49): `h = (230 − (n−1)·41) mod 360`, then normalize (r,g,b)/(r+g+b) for
roughly constant brightness. Blue (n=1) → red (high n). Extends our sphere-color picker
to a per-shell scheme.

### 5. Cutaway modes (validates our approach)

The reference hides particles by setting `size = 0` inside a world region (we cull from
the grid build — same idea, also a perf win). Camera faces −Y in Blender; options
(lines 128–138), in their coords:
- hemisphere facing camera: `y > 0` (the active one)
- vertical wedge: `y + 1.5·|x| > 0`
- horizontal upper quadrant: keep only `y<0 && z>0`  ← matches our current `y>0 && z>0`
- upper hemisphere: `z < 0`
- octant wedge: `not(−o·x + y + |x + o·y| < 0 && z>0)`, o∈{0,1}

Worth exposing as a cutaway **mode** dropdown, with axes remapped to our front=+Z, up=+Y.

### 6. Multi-orbital layout (later)

Full video = loop `n=1..nmax, l=0..n−1, m=0..l`, each cloud at its own offset (the orbital
table). `points_exponent` trades same-count (0) vs same-density (3) of points per orbital.
Start with a **single selectable orbital**; add the grid layout as a follow-on.

## JS implementation notes

Polynomials are needed only for the **density sampling**, not the motion (motion is just
`m/ρ²`):
- **Generalized Laguerre** `L_k^α(x)` (radial density): stable upward recurrence
  `L_0=1`, `L_1 = 1+α−x`, `L_{k+1} = ((2k+1+α−x)L_k − (k+α)L_{k−1})/(k+1)`. Use
  `k=n−l−1`, `α=2l+1`, `x=2r/n`.
- **Associated Legendre** `P_l^m(x)` (angular density via |Y_lm|²): recurrence from `P_m^m`
  up in l. (Only the magnitude is needed; the φ part is uniform.)
- **1-D sampling**: tabulate each marginal density on a fine grid → CDF → inverse-CDF
  lookup (or rejection). One-time at init. `r` over ~[0,100/n-ish], `θ` over [0,π].
- New module `src/lib/scenes/manySpheres/orbital.ts` exporting
  `sampleOrbital(n,l,m,count) -> { positions, speed, meanRadius }` where
  `speed[i] = K·m/(x²+z²)`; `SphereGrid` consumes it in place of the uniform-ball seeding
  (`sphereGrid.ts` constructor loop). The per-frame `theta += speed` loop is unchanged.
- UI: n/l/m selectors (constrained l<n, m≤l) in `App.svelte`; a speed knob for `K`.

## Validation

- Visual: 2p (dumbbell), 3d (toruses/cloverleaf), 4f shapes should be recognizable.
- Cross-check the sampled density against the **Mathematica** outputs (and, if handy, a few
  rows of an original CSV) — same (r,θ) marginal shapes.
- Sanity: `m=0` ⇒ no swirl; higher |m| swirls faster; ω ∝ 1/ρ² (fast near axis); `⟨r⟩`
  grows ~n².

## Open questions

- World scale: notebook uses `a=40` and samples `r∈[0,100]` (Bohr radii). Rescale `r` by a
  constant so ⟨r⟩ fits the existing grid bounds (`clusterRadius`) — the GI/lighting and grid
  sizing assume a ~1.4-radius cluster. ω = m/ρ² must scale consistently (ρ rescales too).
- Epsilon/cap for ω near the spin axis (ρ→0).
- Single orbital first (recommended) vs. straight to the multi-orbital grid.
