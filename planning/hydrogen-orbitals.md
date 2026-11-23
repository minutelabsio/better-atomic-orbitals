# TODO: Generate hydrogen-orbital point clouds analytically (replicate the video)

**Status:** in progress — velocity + distribution sampling done (single selectable
orbital, live switch with no remount). Remaining: size (§3), colour (§4), cutaway
modes (§5), multi-orbital layout (§6).
**Reference:** `reference/Animate Particles Spin Local.py` (the original Blender animator)
**Target look:** https://www.youtube.com/watch?v=W2Xb2GFK2yc

## Progress

- **[done] Motion (§2).** `src/lib/orbital/velocity.ts` exports the pure
  `probabilityCurrentOmega(rho, m, softening)` = `m/(rho²+softening)`. `SphereGrid`
  bakes per-sphere `speed = ω` at seed time (constructor option `m`); the visual
  speed scale `K` is applied live per frame via `update({ speedScale })`, so K is a
  live slider and `m` (orbital identity) triggers a remount. UI: "m (swirl)" + "Speed"
  in `App.svelte`. `update()` was refactored to an options object on the way.
- **[done] Distribution (§1).** `src/lib/orbital/`: `laguerre.ts`, `legendre.ts`
  (poly recurrences), `radialDensity.ts` (|R|²r²), `angularDensity.ts` (|Y|²sinθ),
  `inverseCdfSampler.ts` (tabulate→CDF→invert), `coords.ts`, `sampleOrbital.ts`
  (3 independent 1-D marginals → cylindrical motion state). `SphereGrid.seed/reseed`
  consume it; the radial extent is fit to `clusterRadius` (99th-pct → clusterRadius,
  far tail clamped). Orbital dropdown in `App.svelte`; changing it calls
  `grid.reseed(n,l,m)` via a `$effect` — **no remount** (orbital is not in the `{#key}`).
- **[prototype] Spin current (§2b).** Pauli spin term added to ω, off by default;
  `?spin=up|down` or the dev panel's spin list.
- **[prototype] Fine structure (§2c).** Spin–orbit states |n l j m_j⟩ in the orbital
  list and as `?o=2p3/2m1/2`, colored by measured spin by default
  (`?color=measured|average|plain`); `?split=1` separates the two spins.
- **[todo] Size (§3), colour (§4), cutaway modes (§5), multi-orbital layout (§6).**

### Coordinate plan (decided)

Three frames, one per purpose: **spherical** `(r,θ,φ)` for *sampling* the shape (r,θ
marginals + uniform φ); **cylindrical** `(ρ,φ,y)` for *motion* (rigid azimuthal spin,
`ω=K·m/ρ²`, `ρ=r·sinθ`, `y=r·cosθ`) — already how `SphereGrid` stores/animates;
**cartesian** for the *shader*, recomputed each frame in the hot loop. So: sample in
spherical → convert once to cylindrical at seed time (compute ω there) → emit xyz per
frame. A `coords.ts` of single-purpose conversions arrives with the sampling slice.

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

### 2b. Spin current — the electron-spin term (prototype, `?spin=up|down`)

ω = m/ρ² is the Schrödinger current, which ignores spin. The Pauli current (Holland;
Colijn & Vrscay, Phys. Lett. A 300 (2002) 334, arXiv quant-ph/0308105 and
quant-ph/0304198) adds a divergence-free spin term. In atomic units (ħ = mₑ = 1):

```
v = ∇S + ∇ln|ψ| × s        s = ψ†σψ/ψ†ψ  (unit spin direction for a pure spin state)
```

With s along the quantization axis (s_z = +1 up, −1 down) the extra flow is still a
rigid rotation about the axis, so storage and the per-frame loop are unchanged:

```
ω = m/ρ² − s_z · ∂ρ ln|ψ| / ρ        ∂ρ = sinθ ∂r + (cosθ/r) ∂θ  (at fixed height)
```

e.g. spin up: 1s → 1/r; 2p0 → 1/(2r); 2p(+1) → 1/(2r) (the spin term's −1/ρ² cancels
m/ρ²); 2p(−1) → −2/ρ² + 1/(2r). These closed forms are the tests in `spinCurrent.test.ts`.

Code: `logAmplitudeGradient.ts` (analytic ∇ln|ψ| in cylindrical components),
`spinCurrent.ts` (`spinCurrentVelocity(∇ln|ψ|, s)` = the cross product, any frame;
`axialSpinCurrentOmega` for s along the axis), `spinSwirl.ts` (per-particle ω for one
orbital shape), `spinSetting.ts` (off/up/down → s_z). The swarm adds
`spin · spinUpSwirl` to ω.

Decisions:

- **Units.** `orbitalShape` scales atomic r by `scale = clusterRadius / r₉₉`, so ρ in
  `m/ρ²` has always been in **world units**: today's ω is the atomic ω divided by
  scale², i.e. ħ/mₑ = 1 with the world length unit (and a time unit of one frame,
  times the speed slider). Each orbital records `bohrRadius = scale` (world units per a₀)
  and the spin term is evaluated in world units with a₀ = `bohrRadius`, so it picks up
  the same 1/scale² and the two terms keep their physical ratio under one speed
  constant. (Inherited quirk: each orbital has its own scale, so absolute speeds aren't
  comparable *between* orbitals; that was already true of m/ρ².)
- **Softening.** ψ factors as ρ^|m| · r^(l−|m|) · D_l^|m|(cosθ) · L(2r/n) · e^(−r/n),
  so ∇ln|ψ| is a sum of one term per factor, and each factor but the decay gives a
  1/(distance to its node) singularity (axis, origin, nodal cones, nodal spheres). Each
  one is softened to d/(d² + ε) with the **same ε as the orbital term** (`omegaSoftening`,
  0.02 world² ≈ 0.14 world units). On the axis this gives −|m|/(ρ² + ε), so the 2p(+1)
  spin-up cancellation stays exact with softening on. Linear speed v = ωρ is then
  bounded everywhere (measured over 50k particles: ≤ ~8 world units per unit time, vs
  3.5|m| for the softened orbital term). ω itself can still be large very close to the
  axis or origin, but there v is bounded and the particle only circles a tiny ring.
- **Morphs.** The spin term depends on the whole orbital (n, l, m), not just m, and an
  in-between shape isn't any orbital, so there is no honest "spin term of the morph".
  Instead each particle's spin-term ω is computed at both endpoint orbitals and blended
  with the shape's own mix factor (`createFieldEvaluator` in `shapeMix.ts`); the m/ρ²
  term keeps following the tweened m as before. Mid-morph the 2p(+1) cancellation is
  therefore not exact. The spin setting itself is part of the tweened `OrbitalState`, so
  switching it fades the term in or out over the morph duration.
- **Axis handedness.** Particles are placed at (ρ cosφ, r cosθ, −ρ sinφ)
  (`writeSpheres` in `particleSwarm.ts`), so (ê_ρ, ê_φ, +Y) is right-handed and
  increasing φ is a positive rotation about **+Y**: positive m circulates about +Y,
  and spin up (s parallel to that axis) points along world +Y.
  `particleSwarm.test.ts` pins this from the written sphere positions (r × v along +Y
  for m > 0, and for the 1s spin-up term alone). Until this fix the placement was
  (ρ cosφ, r cosθ, ρ sinφ), a mirror image in which both pointed along −Y. The visible
  side effect of the fix: positive-m orbitals now swirl the other way on screen (seen
  from the default front camera, the near side moves right, toward +X, where it used to
  move left). |ψ|² is symmetric under y → −y, so the shapes don't change. A tilted spin
  axis must give s in this same right-handed world frame.

Follow-ons this is shaped for: spin–orbit fine-structure spinors (built, §2c), and a
tilted/precessing spin axis (call `spinCurrentVelocity` with the full s; the flow stops
being azimuthal, so the per-frame motion would need a 3-D integrator).

### 2c. Fine structure — spin–orbit states (prototype, `?o=2p3/2m1/2`)

A state |n l j m_j⟩ (j = l ± ½) is a Clebsch–Gordan mix of |n l m_j−½⟩ spin up and
|n l m_j+½⟩ spin down with one shared R_nl (`clebschGordan.ts`, Condon–Shortley phases;
coefficients checked against Sakurai 3.8.64 and Griffiths table 4.8). What follows from it,
and where it lives:

- **Shape.** |ψ|² still separates and is axially symmetric, so sampling is unchanged with a
  new polar density (`fineStructureDensity.ts`). Every j = ½ state is spherical: 2p1/2
  samples exactly like 2s.
- **Flow.** The full Pauli current, orbital and spin parts together, is still purely
  azimuthal, so storage and the per-frame loop are unchanged. `fineStructureCurrent.ts`
  writes it as the weighted sum of each component's own flow as a pure spin-up/-down
  orbital (reusing `logAmplitudeGradient`, `axialSpinCurrentOmega` and the same softening)
  plus a cross term from the sideways spin; a stretched state (m_j = ±(l+½)) is therefore
  exactly the §2b orbital + spin term. A fine-structure shape carries this whole ω as a
  per-particle field; its `OrbitalState.m` is 0 and the spin setting doesn't apply to it.
- **Measured spin (the default coloring).** Position and S_z commute, so the Born rule
  gives a joint distribution: P(r, up) = |ψ↑|², P(r, down) = |ψ↓|². Each particle keeps a
  fixed uniform `uSpin` and is labelled up when it falls below P(up | r) = |ψ↑|²/|ψ|²
  (`measuredSpin.ts`). Positions stay samples of |ψ|², so the labelled cloud has exactly
  that joint distribution, and since P(up | r) depends on θ alone the label holds along
  each orbit. Spheres are colored orange (up) or blue (down). The colors label possible
  measurement outcomes for the one electron, not separate particles: every sphere, either
  color, follows the electron's single Pauli flow. 2p1/2 m_j=½ shows as ⅓ up in a p0
  dumbbell plus ⅔ down in a p(+1) torus, together a round cloud; 2p3/2 m_j=½ is the same
  two shapes weighted ⅔ up, ⅓ down. `measuredSpin.test.ts` checks the up fraction against
  |c↑|² and each spin's polar histogram against its |Y_l^m|² sin θ.
- **Average spin (`?color=average`).** s = ψ†σψ/ψ†ψ lies in the meridional plane and
  depends on θ alone (`spinDirection.ts`), so each particle's tilt is fixed for life; it's
  shown through a three-stop palette (`spinPalette.ts`). It's the local expectation value,
  so most spheres get an in-between color that no measurement would give.
- **Separate by spin (`?split=1`).** Slides measured spin-up spheres along the axis
  positive m circulates about (world −Y) and spin-down ones the other way, by
  `SPIN_SEPARATION_DISTANCE`, tweened with the morph config (`spinSeparation.ts`). It's a
  drawing device reminiscent of Stern–Gerlach separation, not physical motion: the shift
  is added where spheres are written out, so the flow is untouched.
- **Checks.** `fineStructureCurrent.test.ts` compares against Colijn & Vrscay
  (quant-ph/0304198) Table 1, all five rows and their −m_j mirrors, and against a
  brute-force current from finite differences of the complex spinor (hand-written R_nl,
  Y_lm tables), which also confirms there's no flow off the azimuth. Table 1 agrees
  exactly; no typo found in it.

Decisions:

- **Handedness.** Everything is computed in the right-handed physics frame (ê_ρ, ê_φ, ê_axis)
  where positive m_j circulates with increasing φ, and ω drives the swarm's φ as m/ρ² does,
  so the mirror placement of §2b ("Axis handedness") applies unchanged: positive m_j
  circulates about world −Y. "Up" in the palette is spin along the axis positive m
  circulates about (world −Y), the same convention as §2b's spin up.
- **Renderer.** One float per sphere (±1 measured, or the average's cos tilt) in a
  one-channel texture laid out like the sphere texture, uploaded only when the state or
  the choice changes; the shaders map it to a color by tilt angle, so ±1 lands on the
  palette's two ends. The coloring is `?color=measured|average|plain`; absent, a
  fine-structure state gets `measured` and a plain orbital `plain` (`sphereColoring.ts`),
  so a bare `?o=2p1/2m1/2` link shows the two spins. A spinless state (plain orbital, spin off)
  keeps the uniform sphere color either way. The dev panel's spin list doesn't apply to a
  fine-structure state and is shown disabled. In the object-space GI probe a bounce takes the
  neighbour's own color, so color bleeding still works; both renderers support it.
- **Separation distance and the grid.** The grid is a fixed-resolution cube just around the
  cloud, so while separated its extent widens by the shift (`gridExtent`, same cell count).
  Bigger cells hold more spheres, and a cell past the tracer's 64-sphere cap drops the rest:
  at 50k spheres that already happens in today's 1s core, and the split adds some more in
  the separated cores. The distance (1 world unit, about 0.7 of the cloud radius) keeps both
  halves mostly in the default camera's view; the p0 dumbbell's tips still reach past the
  bottom edge.
- **Morphs.** Shapes morph as usual. The fine-structure ω field blends between endpoints
  like the §2b spin term while the m/ρ² term fades with the tweened m, so speeds change
  smoothly but aren't the current of any in-between state. Colors don't blend: they snap
  to the nearer end of the morph (`dominantShape`).
- **Picker.** All fine-structure states up to n = 3 are listed after the |n l m⟩ orbitals;
  links take any n ≤ MAX_N.


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
