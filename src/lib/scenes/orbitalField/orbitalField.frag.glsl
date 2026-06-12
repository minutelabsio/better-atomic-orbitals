// orbitalField.frag.glsl  (GLSL ES 3.00)
//
// A volumetric render of the hydrogen-atom probability density |psi_nlm|^2,
// drawn as a single colour whose opacity grows with the density: darker regions
// are where the electron is more likely to be found. This scene exists to *check
// the orbital physics by eye* -- so every formula below is written straight from
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
uniform vec3  uOrbitalColor;
uniform vec3  uBgColor;
uniform bool  uCutaway;
uniform int   uSteps;

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

  // Fixed step size across the (tightened) shell, so a short chord costs few steps
  // and a full diameter costs ~uSteps -- the loop bound below is just a ceiling.
  float dsWorld = (2.0 * marchRadius) / float(uSteps);
  float dsAtomic = dsWorld * atomicScale;

  // Beer-Lambert transmittance once tau exceeds this is < 0.4%, i.e. the pixel is
  // already visually saturated to the orbital colour -- no later sample can change
  // it, so we stop marching. This is the main perf lever for dense orbitals.
  const float TAU_OPAQUE = 5.5; // exp(-5.5) ~= 0.0041

  // Optical depth tau = integral of ( gain * <r>^2 * |psi|^2 ) ds along the ray.
  // The <r>^2 factor cancels the way the density's column integral shrinks as the
  // orbital grows, so a single exposure reads well across all (n, l, m).
  float tau = 0.0;
  for (int i = 0; i < uSteps; i++) {
    float t = t0 + (float(i) + 0.5) * dsWorld;
    if (t > t1) break;                           // marched past the shell -> done

    vec3 pWorld = ro + rd * t;
    if (uCutaway && pWorld.z > 0.0) continue;    // slice off the +Z half to expose nodes

    vec3 pAtomic = pWorld * atomicScale;
    // empty-space skip #2: inside the hollow centrifugal core, skip the costly
    // wavefunction evaluation (high-l orbitals are a thin shell around a void).
    if (dot(pAtomic, pAtomic) < rInnerAtomicSq) continue;

    float density = probabilityDensity(uN, uL, uM, pAtomic);
    tau += uGain * rMean * rMean * density * dsAtomic;

    // ---------------------------------------------------------------------
    // EARLY-RAY TERMINATION: bail out as soon as the ray is effectively opaque.
    // The remaining samples would only add to an already-saturated tau, so the
    // final colour is unchanged -- but we skip the rest of the (expensive)
    // per-step wavefunction evaluations. Pure speed-up, no visual difference.
    // ---------------------------------------------------------------------
    if (tau > TAU_OPAQUE) break;
  }

  // Beer-Lambert: more density -> less transmitted light -> more opaque colour.
  float opacity = 1.0 - exp(-tau);
  vec3 color = mix(uBgColor, uOrbitalColor, opacity);
  fragColor = vec4(color, 1.0);
}
