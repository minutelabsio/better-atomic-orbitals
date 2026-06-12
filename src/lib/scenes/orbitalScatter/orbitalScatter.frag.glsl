// orbitalScatter.frag.glsl  (GLSL ES 3.00)
//
// A volumetric render of the hydrogen-atom probability density |psi_nlm|^2, treated
// as the density of a participating medium (a "cloud") and lit by a single key light
// in the sky via single scattering with a Henyey-Greenstein phase function. The
// electron's probable haunts are exactly where the cloud is thick. This scene exists
// to *check the orbital physics by eye* -- so every formula below is written straight from
// the textbook definitions (no data tables, no precomputed coefficients, no reuse
// of the project's TypeScript math) and laid out as functions a physicist will
// recognise.
//
// Conventions: Hartree atomic units, so the Bohr radius a0 = 1. The quantisation
// axis is +Y (to match the orbiting-cloud scene, whose spin axis is Y). For a
// definite-m energy eigenstate the density |psi_nlm|^2 is independent of the
// azimuth phi, hence the field is rotationally symmetric about the Y axis.
//
// Sources:
//  [1] D. J. Griffiths & D. F. Schroeter, Introduction to Quantum Mechanics,
//      3rd ed., Sec. 4.2: psi_nlm = R_nl(r) Y_l^m(theta,phi); radial R_nl in
//      Eqs. 4.75 / 4.89 (Table 4.7).
//  [2] NIST DLMF 18.9.13 -- recurrence for the generalized Laguerre L_k^a(x).
//  [3] NIST DLMF 14.10.3 & Numerical Recipes (3rd ed.) routine "plgndr" --
//      recurrence for the associated Legendre function P_l^m(x).
//  [4] NIST DLMF 14.30.1 / Wikipedia "Spherical harmonics" -- normalisation of
//      Y_l^m so that the |Y_l^m|^2 integrate to 1 over the sphere.
//  [5] Wikipedia "Hydrogen atom" -- assembled R_nl with the
//      L_{n-l-1}^{2l+1}(2r/n) convention used here.

precision highp float;

in vec2 vNDC;
out vec4 fragColor;

uniform vec3  uCameraPos;
uniform mat4  uInvViewProj;
uniform int   uN;     // principal quantum number n  (n >= 1)
uniform int   uL;     // azimuthal quantum number l  (0 <= l <= n-1)
uniform int   uM;     // magnetic  quantum number m  (-l <= m <= l)
uniform float uGain;  // exposure: overall scale on the optical depth
uniform vec3  uOrbitalColor;  // single-scattering albedo of the cloud (its colour)
uniform vec3  uBgColor;       // sky colour: seen on a miss and used as ambient fill
uniform bool  uCutaway;
uniform int   uSteps;
uniform vec3  uLightDir;     // unit direction *towards* the key light (the "sun")
uniform vec3  uLightColor;   // radiance of the sun (already scaled by intensity)
uniform float uAnisotropy;   // Henyey-Greenstein g: 0 isotropic, >0 forward-peaked
uniform float uAmbient;      // strength of the uniform sky fill (× uBgColor)

const float PI = 3.141592653589793;
const float R_VIEW = 1.6;            // world radius of the sphere we integrate inside
const float WORLD_PER_MEAN = 0.6;    // <r> of the orbital maps to this many world units
const float TAIL_BOHR_PER_N = 2.5;   // quantum-tunnelling pad past the turning points, in (a0 * n)

// ---------------------------------------------------------------------------
// Elementary special functions
// ---------------------------------------------------------------------------

// k!  (we only ever need small arguments: the largest is (n+l)! with n+l <= 11)
float factorial(int k) {
  float f = 1.0;
  for (int i = 2; i <= k; i++) f *= float(i);
  return f;
}

// Generalized Laguerre polynomial L_k^alpha(x), built from the stable upward
// recurrence [2]
//     L_0^a = 1,   L_1^a = 1 + a - x,
//     (i+1) L_{i+1}^a = (2i+1+a - x) L_i^a - (i+a) L_{i-1}^a.
float generalizedLaguerre(int k, float alpha, float x) {
  if (k <= 0) return 1.0;
  float Lprev = 1.0;              // L_0
  float Lcur  = 1.0 + alpha - x;  // L_1
  for (int i = 1; i < k; i++) {
    float fi = float(i);
    float Lnext = ((2.0 * fi + 1.0 + alpha - x) * Lcur - (fi + alpha) * Lprev) / (fi + 1.0);
    Lprev = Lcur;
    Lcur  = Lnext;
  }
  return Lcur;
}

// Associated Legendre function P_l^m(x) for m >= 0 and |x| <= 1, from the
// recurrence [3]
//     P_m^m     = (-1)^m (2m-1)!! (1-x^2)^(m/2),
//     P_{m+1}^m = x (2m+1) P_m^m,
//     (l-m) P_l^m = x (2l-1) P_{l-1}^m - (l+m-1) P_{l-2}^m.
float associatedLegendre(int l, int m, float x) {
  m = abs(m);
  if (m > l) return 0.0;

  // seed P_m^m
  float pmm = 1.0;
  if (m > 0) {
    float somx2 = sqrt(max(0.0, 1.0 - x * x)); // (1 - x^2)^(1/2)
    float odd = 1.0;                           // runs 1, 3, 5, ... = (2i-1)
    for (int i = 1; i <= m; i++) {
      pmm *= -odd * somx2;                      // accumulates (-1)^m (2m-1)!! (1-x^2)^(m/2)
      odd += 2.0;
    }
  }
  if (l == m) return pmm;

  float pmmp1 = x * (2.0 * float(m) + 1.0) * pmm; // P_{m+1}^m
  if (l == m + 1) return pmmp1;

  // climb in l up to the requested degree
  float pll = 0.0;
  for (int ll = m + 2; ll <= l; ll++) {
    float fll = float(ll);
    pll = (x * (2.0 * fll - 1.0) * pmmp1 - (fll + float(m) - 1.0) * pmm) / (fll - float(m));
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

// ---------------------------------------------------------------------------
// Hydrogen wavefunction
// ---------------------------------------------------------------------------

// Radial wavefunction R_nl(r) in atomic units (a0 = 1) [1],[5]:
//     rho     = 2 r / n,
//     R_nl(r) = sqrt[ (2/n)^3 (n-l-1)! / (2 n (n+l)!) ]
//               * e^{-rho/2} * rho^l * L_{n-l-1}^{2l+1}(rho).
float radialWavefunction(int n, int l, float r) {
  float fn = float(n);
  float rho = 2.0 * r / fn;
  float norm = sqrt(pow(2.0 / fn, 3.0) * factorial(n - l - 1) / (2.0 * fn * factorial(n + l)));
  float rhoPowL = (l == 0) ? 1.0 : pow(rho, float(l)); // avoid pow(0,0) at the origin
  float laguerre = generalizedLaguerre(n - l - 1, 2.0 * float(l) + 1.0, rho);
  return norm * exp(-0.5 * rho) * rhoPowL * laguerre;
}

// |Y_l^m(theta, phi)|^2, the phi-independent angular probability factor [3],[4]:
//     |Y_l^m|^2 = (2l+1)/(4 pi) * (l-|m|)!/(l+|m|)! * [P_l^|m|(cos theta)]^2.
float sphericalHarmonicSq(int l, int m, float cosTheta) {
  int am = abs(m);
  float p = associatedLegendre(l, am, cosTheta);
  float norm = (2.0 * float(l) + 1.0) / (4.0 * PI)
             * factorial(l - am) / factorial(l + am);
  return norm * p * p;
}

// Full probability density |psi_nlm|^2 at an atomic-unit Cartesian point.
// theta is measured from the +Y quantisation axis.
float probabilityDensity(int n, int l, int m, vec3 posAtomic) {
  float r = length(posAtomic);
  float cosTheta = (r > 0.0) ? posAtomic.y / r : 1.0;
  float R = radialWavefunction(n, l, r);
  return R * R * sphericalHarmonicSq(l, m, cosTheta);
}

// ---------------------------------------------------------------------------
// Ray / volume rendering
// ---------------------------------------------------------------------------

// Nearest/farthest intersection of a ray with an origin-centred sphere of
// radius rad. Returns false on a miss; on a hit t0 <= t1.
bool intersectSphere(vec3 ro, vec3 rd, float rad, out float t0, out float t1) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - rad * rad;
  float disc = b * b - c;
  if (disc < 0.0) return false;
  float s = sqrt(disc);
  t0 = -b - s;
  t1 = -b + s;
  return true;
}

// Henyey-Greenstein phase function: the probability (per steradian) that a photon
// travelling along w_in scatters into w_out, parametrised by the asymmetry g via
// cosTheta = dot(w_in, w_out). g = 0 is isotropic; g -> 1 is sharply forward
// (a bright "silver lining" when you look towards the sun through the cloud).
//     p(cosTheta) = (1 - g^2) / ( 4 pi (1 + g^2 - 2 g cosTheta)^(3/2) ).
float henyeyGreenstein(float cosTheta, float g) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * PI * pow(max(denom, 1e-4), 1.5));
}

// Extinction coefficient sigma_t at an atomic-unit point: the cloud density is the
// orbital probability |psi|^2 (× the same gain/<r>^2 exposure the absorption render
// used). Honours the cutaway slice and the hollow centrifugal core so shadows agree
// with what the eye marches through.
float extinctionAt(vec3 pAtomic, float rInnerSq, float scale) {
  if (uCutaway && pAtomic.z > 0.0) return 0.0;
  if (dot(pAtomic, pAtomic) < rInnerSq) return 0.0;
  return uGain * scale * probabilityDensity(uN, uL, uM, pAtomic);
}

// Transmittance of sunlight reaching pAtomic: march a short shadow ray towards the
// light, accumulate optical depth, and apply Beer-Lambert. This is the single-
// scattering "self-shadowing" that gives the cloud volume its lit/shadowed sides.
float lightTransmittance(vec3 pAtomic, float rOuter, float rInnerSq, float scale) {
  const int LIGHT_STEPS = 6;
  float ds = (2.0 * rOuter) / float(LIGHT_STEPS); // spans the shell in LIGHT_STEPS hops
  float tau = 0.0;
  for (int i = 0; i < LIGHT_STEPS; i++) {
    vec3 lp = pAtomic + uLightDir * (float(i) + 0.5) * ds;
    if (dot(lp, lp) > rOuter * rOuter) break; // left the cloud -> no more occluders
    tau += extinctionAt(lp, rInnerSq, scale) * ds;
  }
  return exp(-tau);
}

void main() {
  // reconstruct the world-space view ray through this pixel
  vec4 world = uInvViewProj * vec4(vNDC, -1.0, 1.0);
  world /= world.w;
  vec3 ro = uCameraPos;
  vec3 rd = normalize(world.xyz - uCameraPos);

  // Frame the orbital: map the mean radius <r>_nl = (3n^2 - l(l+1)) / 2 (atomic
  // units) to a fixed fraction of the view sphere, so every orbital fills the
  // frame similarly. atomicScale converts a world length into atomic units.
  float rMean = 0.5 * (3.0 * float(uN * uN) - float(uL * (uL + 1)));
  float atomicScale = rMean / WORLD_PER_MEAN;

  // =========================================================================
  // EMPTY-SPACE SKIPPING: only march the radial shell the electron can occupy.
  // The radial probability r^2 |R_nl|^2 is appreciable only between the classical
  // turning points of the Coulomb effective potential
  //     V_eff(r) = -1/r + l(l+1) / (2 r^2),     bound-state energy E_n = -1/(2 n^2).
  // Solving V_eff(r) = E_n gives the turning radii (atomic units)
  //     r_{inner,outer} = n^2 -/+ n * sqrt( n^2 - l(l+1) ).
  // Outside [r_inner, r_outer] the state is classically forbidden and |psi|^2
  // decays exponentially, so we pad by a few Bohr radii of quantum tail and skip
  // everything beyond -- the empty outer space AND the hollow centrifugal core.
  // [Coulomb effective potential / Bohr model; see e.g. Griffiths QM Sec. 4.1-4.2]
  // =========================================================================
  float turning = float(uN) * sqrt(max(0.0, float(uN * uN) - float(uL * (uL + 1))));
  float tail = TAIL_BOHR_PER_N * float(uN);
  float rInnerAtomic = max(0.0, float(uN * uN) - turning - tail);
  float rOuterAtomic = float(uN * uN) + turning + tail;
  float rInnerAtomicSq = rInnerAtomic * rInnerAtomic;

  // outer bound -> world; clip to the view sphere (can't see past it anyway)
  float marchRadius = min(rOuterAtomic / atomicScale, R_VIEW);

  // A ray that misses the shell sphere contributes no density at all -> background.
  // This culls every pixel whose line of sight passes outside the orbital.
  float t0, t1;
  if (!intersectSphere(ro, rd, marchRadius, t0, t1)) {
    fragColor = vec4(uBgColor, 1.0);
    return;
  }
  t0 = max(t0, 0.0);

  // CUTAWAY: analytically clip the march interval to the visible (z <= 0) half-space.
  // Integration then begins exactly at the cut plane, so every ray samples at the same
  // phase relative to it -- this removes the per-pixel step-phase banding a hard cut
  // produces, while still skipping the culled half entirely. (The shadow march keeps
  // using extinctionAt's cutaway test, so the culled half casts no shadow either.)
  if (uCutaway) {
    if (abs(rd.z) > 1e-6) {
      float tPlane = -ro.z / rd.z;
      if (rd.z > 0.0) t1 = min(t1, tPlane); // z grows along the ray -> keep t <= tPlane
      else            t0 = max(t0, tPlane); // z shrinks along the ray -> keep t >= tPlane
    } else if (ro.z > 0.0) {
      t0 = t1; // ray lies entirely in the culled half
    }
    if (t0 >= t1) { fragColor = vec4(uBgColor, 1.0); return; }
  }

  // Fixed step size across the (tightened) shell, so a short chord costs few steps
  // and a full diameter costs ~uSteps -- the loop bound below is just a ceiling.
  float dsWorld = (2.0 * marchRadius) / float(uSteps);
  float dsAtomic = dsWorld * atomicScale;

  // Once the view ray has lost all but this fraction of its light the cloud ahead is
  // effectively hidden -- no later sample can brighten the pixel, so we stop. This is
  // the main perf lever for dense orbitals (replaces the old opacity-saturation cut).
  const float MIN_TRANSMITTANCE = 0.01;

  // The extinction sigma_t = gain * <r>^2 * |psi|^2. The <r>^2 factor cancels the way
  // the density's column integral shrinks as the orbital grows, so one exposure reads
  // well across all (n, l, m).
  float scale = rMean * rMean;

  // ---------------------------------------------------------------------------
  // Single-scattering volumetric lighting.
  //   - View transmittance T attenuates by exp(-sigma ds) at every step.
  //   - In-scattered radiance at a sample = albedo * (sunlight * phase + ambient),
  //     where sunlight is the key light folded through its own shadow march and the
  //     Henyey-Greenstein phase function tilts it forward/back relative to the eye.
  //   - We accumulate front-to-back; the analytic per-step weight T*(1 - exp(-sigma ds))
  //     is energy-conserving and free of the banding a midpoint sum would show.
  // ---------------------------------------------------------------------------
  float phase = henyeyGreenstein(dot(rd, uLightDir), uAnisotropy);
  vec3 ambient = uBgColor * uAmbient; // uniform sky fill so shadowed sides aren't black

  vec3 scattered = vec3(0.0);
  float transmittance = 1.0;
  for (int i = 0; i < uSteps; i++) {
    float t = t0 + (float(i) + 0.5) * dsWorld;
    if (t > t1) break;                           // marched past the shell -> done

    vec3 pAtomic = (ro + rd * t) * atomicScale;
    float sigma = extinctionAt(pAtomic, rInnerAtomicSq, scale); // 0 in cutaway / core
    if (sigma > 1e-4) {
      float sunlight = lightTransmittance(pAtomic, rOuterAtomic, rInnerAtomicSq, scale);
      vec3 inScatter = uOrbitalColor * (uLightColor * sunlight * phase )+ ambient;

      float stepT = exp(-sigma * dsAtomic);
      scattered += transmittance * (1.0 - stepT) * inScatter;
      transmittance *= stepT;

      if (transmittance < MIN_TRANSMITTANCE) break; // ray effectively opaque -> done
    }
  }

  // Composite the in-scattered light over whatever sky shows through the cloud.
  vec3 color = scattered + transmittance * uBgColor;
  fragColor = vec4(color, 1.0);
}
