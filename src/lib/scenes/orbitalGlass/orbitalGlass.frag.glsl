// orbitalGlass.frag.glsl  (GLSL ES 3.00)
//
// The hydrogen-atom probability density |psi_nlm|^2 rendered as a SOLID GLASS body:
// an isosurface |psi|^2 = c (scaled) is treated as a dielectric boundary. Rays from
// the eye are refracted into the glass, attenuated by Beer-Lambert tint inside, and
// refracted back out; a Fresnel term splits each interface into reflection (sampled
// from the sky cubemap) and transmission. Because orbitals have nodes, a single
// isovalue yields several disjoint/nested shells, and the tracer walks through up to
// MAX_INTERFACES of them -- so you can see one lobe through another, lensing the sky.
//
// The wavefunction itself is written straight from the textbook definitions (same as
// the Field / Scatter scenes) so the physics stays inspectable. Conventions: Hartree
// atomic units (a0 = 1); quantisation axis +Y; |psi_nlm|^2 is phi-independent.
//
// Sources for the special functions: Griffiths QM 3rd ed. Sec 4.2; NIST DLMF 18.9.13
// (Laguerre) and 14.10.3 (Legendre); Wikipedia "Hydrogen atom" / "Spherical harmonics".

precision highp float;

in vec2 vNDC;
out vec4 fragColor;

uniform vec3  uCameraPos;
uniform mat4  uInvViewProj;
uniform int   uN;          // principal quantum number n  (n >= 1)
uniform int   uL;          // azimuthal quantum number l  (0 <= l <= n-1)
uniform int   uM;          // magnetic  quantum number m  (-l <= m <= l)
uniform int   uSteps;      // marching budget per ray segment
uniform float uIso;        // isosurface threshold on the scaled density field
uniform float uIOR;        // index of refraction of the glass (~1.5)
uniform vec3  uGlassTint;   // colour the glass lets through (Beer-Lambert)
uniform float uAbsorb;     // strength of the interior absorption (0 = water-clear)
uniform bool  uDensityGraded; // if true, interior tint follows |psi|^2 (denser = more glass)
uniform bool  uCutaway;
uniform samplerCube uEnvMap; // sky cubemap: backdrop + reflection/refraction source

const float PI = 3.141592653589793;
const float R_VIEW = 1.6;            // world radius of the sphere we integrate inside
const float WORLD_PER_MEAN = 0.6;    // <r> of the orbital maps to this many world units
const float TAIL_BOHR_PER_N = 2.5;   // quantum-tunnelling pad past the turning points
const int   MAX_INTERFACES = 6;      // dielectric crossings followed before giving up

// ---------------------------------------------------------------------------
// Elementary special functions  (small integer args only)
// ---------------------------------------------------------------------------

float factorial(int k) {
  float f = 1.0;
  for (int i = 2; i <= k; i++) f *= float(i);
  return f;
}

// Generalized Laguerre L_k^alpha(x) via the stable upward recurrence.
float generalizedLaguerre(int k, float alpha, float x) {
  if (k <= 0) return 1.0;
  float Lprev = 1.0;
  float Lcur  = 1.0 + alpha - x;
  for (int i = 1; i < k; i++) {
    float fi = float(i);
    float Lnext = ((2.0 * fi + 1.0 + alpha - x) * Lcur - (fi + alpha) * Lprev) / (fi + 1.0);
    Lprev = Lcur;
    Lcur  = Lnext;
  }
  return Lcur;
}

// Associated Legendre P_l^m(x) for m >= 0, |x| <= 1, via the standard recurrence.
float associatedLegendre(int l, int m, float x) {
  m = abs(m);
  if (m > l) return 0.0;
  float pmm = 1.0;
  if (m > 0) {
    float somx2 = sqrt(max(0.0, 1.0 - x * x));
    float odd = 1.0;
    for (int i = 1; i <= m; i++) {
      pmm *= -odd * somx2;
      odd += 2.0;
    }
  }
  if (l == m) return pmm;
  float pmmp1 = x * (2.0 * float(m) + 1.0) * pmm;
  if (l == m + 1) return pmmp1;
  float pll = 0.0;
  for (int ll = m + 2; ll <= l; ll++) {
    float fll = float(ll);
    pll = (x * (2.0 * fll - 1.0) * pmmp1 - (fll + float(m) - 1.0) * pmm) / (fll - float(m));
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

// Radial wavefunction R_nl(r) in atomic units.
float radialWavefunction(int n, int l, float r) {
  float fn = float(n);
  float rho = 2.0 * r / fn;
  float norm = sqrt(pow(2.0 / fn, 3.0) * factorial(n - l - 1) / (2.0 * fn * factorial(n + l)));
  float rhoPowL = (l == 0) ? 1.0 : pow(rho, float(l));
  float laguerre = generalizedLaguerre(n - l - 1, 2.0 * float(l) + 1.0, rho);
  return norm * exp(-0.5 * rho) * rhoPowL * laguerre;
}

// |Y_l^m|^2, the phi-independent angular probability factor.
float sphericalHarmonicSq(int l, int m, float cosTheta) {
  int am = abs(m);
  float p = associatedLegendre(l, am, cosTheta);
  float norm = (2.0 * float(l) + 1.0) / (4.0 * PI)
             * factorial(l - am) / factorial(l + am);
  return norm * p * p;
}

// |psi_nlm|^2 at an atomic-unit Cartesian point (theta from +Y).
float probabilityDensity(vec3 posAtomic) {
  float r = length(posAtomic);
  float cosTheta = (r > 0.0) ? posAtomic.y / r : 1.0;
  float R = radialWavefunction(uN, uL, r);
  return R * R * sphericalHarmonicSq(uL, uM, cosTheta);
}

// The scalar field whose isosurface is the glass surface: a scale-normalised density
// (the <r>^2 factor makes one isovalue read across all n,l,m). The cutaway slice and
// the region outside the view shell read as empty so they become "air".
float fieldValue(vec3 pAtomic, float scale) {
  if (uCutaway && pAtomic.z > 0.0) return 0.0;
  return scale * probabilityDensity(pAtomic);
}

// ---------------------------------------------------------------------------
// Ray / surface utilities
// ---------------------------------------------------------------------------

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

// Sample the sky cubemap in linear light. CubeTextureLoader textures use the left-
// handed cube convention three.js assumes, so we flip X (matches three's flipEnvMap).
vec3 sampleEnv(vec3 dir) {
  vec3 c = texture(uEnvMap, vec3(-dir.x, dir.y, dir.z)).rgb;
  return pow(c, vec3(2.2)); // sRGB -> linear; the composer re-encodes on output
}

// Schlick's approximation to the Fresnel reflectance.
float fresnelSchlick(float cosTheta, float f0) {
  float m = clamp(1.0 - cosTheta, 0.0, 1.0);
  float m2 = m * m;
  return f0 + (1.0 - f0) * m2 * m2 * m;
}

// Surface normal = normalized gradient of the field (points towards higher density).
vec3 fieldNormal(vec3 pAtomic, float scale, float h) {
  float dx = fieldValue(pAtomic + vec3(h, 0.0, 0.0), scale) - fieldValue(pAtomic - vec3(h, 0.0, 0.0), scale);
  float dy = fieldValue(pAtomic + vec3(0.0, h, 0.0), scale) - fieldValue(pAtomic - vec3(0.0, h, 0.0), scale);
  float dz = fieldValue(pAtomic + vec3(0.0, 0.0, h), scale) - fieldValue(pAtomic - vec3(0.0, 0.0, h), scale);
  vec3 g = vec3(dx, dy, dz);
  float len = length(g);
  return (len > 0.0) ? g / len : vec3(0.0, 1.0, 0.0);
}

// March the current ray for the next place the field crosses uIso, i.e. where the
// solid/air state flips relative to insideNow. Refines the hit with a short
// bisection. Returns false if no crossing before the ray leaves the view shell.
// densInt returns the integral of the field over the marched segment (its optical-
// depth integrand); main only uses it for the inside segment in density-graded mode.
bool nextCrossing(vec3 cro, vec3 crd, float scale, bool insideNow,
                  float marchRadius, float atomicScale,
                  out float tHit, out float densInt) {
  densInt = 0.0;
  float a0, a1;
  if (!intersectSphere(cro, crd, marchRadius, a0, a1)) return false;
  a0 = max(a0, 0.0);
  float ds = (a1 - a0) / float(uSteps);
  float prevT = a0;
  for (int i = 0; i < uSteps; i++) {
    float t = a0 + (float(i) + 0.5) * ds;
    if (t > a1) break;
    float fv = fieldValue((cro + crd * t) * atomicScale, scale);
    densInt += max(fv, 0.0) * ds; // reuses the same field eval as the solid test
    if ((fv >= uIso) != insideNow) {
      float lo = prevT, hi = t;
      for (int k = 0; k < 6; k++) {
        float mid = 0.5 * (lo + hi);
        bool s = fieldValue((cro + crd * mid) * atomicScale, scale) >= uIso;
        if (s == insideNow) lo = mid; else hi = mid;
      }
      tHit = 0.5 * (lo + hi);
      return true;
    }
    prevT = t;
  }
  return false;
}

void main() {
  // reconstruct the world-space view ray through this pixel
  vec4 world = uInvViewProj * vec4(vNDC, -1.0, 1.0);
  world /= world.w;
  vec3 ro = uCameraPos;
  vec3 rd = normalize(world.xyz - uCameraPos);

  // Frame the orbital exactly like the other scenes: map <r> to a fixed fraction of
  // the view sphere so every (n,l,m) fills the frame similarly.
  float rMean = 0.5 * (3.0 * float(uN * uN) - float(uL * (uL + 1)));
  float atomicScale = rMean / WORLD_PER_MEAN;
  float scale = rMean * rMean;

  // Outer radius of the occupied shell (classical turning point + quantum tail).
  float turning = float(uN) * sqrt(max(0.0, float(uN * uN) - float(uL * (uL + 1))));
  float tail = TAIL_BOHR_PER_N * float(uN);
  float rOuterAtomic = float(uN * uN) + turning + tail;
  float marchRadius = min(rOuterAtomic / atomicScale, R_VIEW);

  float dsWorld = (2.0 * marchRadius) / float(uSteps);
  float dsAtomic = dsWorld * atomicScale;
  float surfaceOffset = dsWorld * 0.5; // nudge past a surface so we don't re-detect it

  // Fresnel reflectance at normal incidence for an air/glass boundary.
  float f0 = (1.0 - uIOR) / (1.0 + uIOR);
  f0 *= f0;

  // Dielectric path tracer: follow one refracted path through the nested shells,
  // splitting off a reflection-to-sky at every interface.
  vec3 throughput = vec3(1.0);
  vec3 accum = vec3(0.0);
  vec3 cro = ro;
  vec3 crd = rd;
  bool inside = false;
  vec3 enterPoint = ro;

  for (int b = 0; b < MAX_INTERFACES; b++) {
    float tHit, segDensity;
    if (!nextCrossing(cro, crd, scale, inside, marchRadius, atomicScale, tHit, segDensity)) break;

    vec3 pWorld = cro + crd * tHit;
    vec3 pAtomic = pWorld * atomicScale;

    // Attenuate by the glass tint over the interior segment just traversed. Uniform
    // glass uses the geometric thickness; density-graded glass weights it by the local
    // density (extinction = uAbsorb * field / uIso), so dense cores tint far more than
    // tenuous shells -- the "glassiness" grows with |psi|^2.
    if (inside) {
      float depth = uDensityGraded ? (segDensity / max(uIso, 1e-6))
                                    : length(pWorld - enterPoint);
      vec3 sigma = uAbsorb * (vec3(1.0) - uGlassTint);
      throughput *= exp(-sigma * depth);
    }

    // gradient normal, oriented to face the incoming ray
    vec3 n = fieldNormal(pAtomic, scale, dsAtomic);
    if (dot(n, crd) > 0.0) n = -n;

    float cosI = clamp(dot(-crd, n), 0.0, 1.0);
    float eta = inside ? uIOR : (1.0 / uIOR);
    vec3 refrDir = refract(crd, n, eta);
    bool tir = dot(refrDir, refrDir) < 1e-6; // total internal reflection
    float reflectance = tir ? 1.0 : fresnelSchlick(cosI, f0);

    // reflected energy escapes to the sky (single bounce, no recursive march)
    accum += throughput * reflectance * sampleEnv(reflect(crd, n));
    throughput *= (1.0 - reflectance);
    if (tir) break;

    // continue along the transmitted ray
    crd = refrDir;
    cro = pWorld + crd * surfaceOffset;
    inside = !inside;
    if (inside) enterPoint = cro;

    if (max(throughput.r, max(throughput.g, throughput.b)) < 0.01) break;
  }

  // remaining light leaves to the sky in whatever direction the path now points
  accum += throughput * sampleEnv(crd);
  fragColor = vec4(accum, 1.0);
}
