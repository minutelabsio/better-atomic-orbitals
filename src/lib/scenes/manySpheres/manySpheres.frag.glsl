precision highp float;
precision highp int;

in vec2 vNDC;
out vec4 fragColor;

uniform vec3 uCameraPos;
uniform mat4 uInvViewProj;

// --- grid / data textures ---
uniform sampler2D uSpherePos;   // RGBA32F: xyz centre, w radius
uniform sampler2D uCellRange;   // RGBA32F: r offset, g count
uniform sampler2D uIndexList;   // R32F: sphere indices grouped by cell
uniform int uSpherePosTexW;
uniform int uCellRangeTexW;
uniform int uIndexListTexW;
uniform int uGridRes;
uniform float uBoundMin;
uniform float uCellSize;

uniform vec3 uAlbedo;
uniform vec3 uBackground;

// --- temporal accumulation ---
uniform sampler2D uHistory;
uniform float uBlend;   // EMA weight for the current sample (1.0 = reset)
uniform uint uFrame;
uniform bool uRandomize; // false = freeze the per-pixel sample pattern each frame

#define MAX_STEPS 256
#define MAX_PER_CELL 64
#define SAMPLES 1
#define SHADOWS 1   // 1 = trace a shadow ray for the key light (contact shadows)
#define EPS 1e-4
#define PI 3.14159265359
#define TFAR 1e30

// three directional lights (dir points toward the light)
const vec3 L0_DIR = normalize(vec3(0.6, 0.9, 0.5));
const vec3 L0_COL = vec3(1.0, 0.96, 0.9) * 1.5;
const vec3 L1_DIR = normalize(vec3(-0.7, 0.3, -0.4));
const vec3 L1_COL = vec3(0.55, 0.65, 0.85) * 0.7;
const vec3 L2_DIR = normalize(vec3(0.1, -0.6, 0.7));
const vec3 L2_COL = vec3(0.9, 0.7, 0.5) * 0.35;
const float AMBIENT = 0.02;

// background + environment (also the indirect light when a bounce ray misses);
// the chosen colour with a soft top-to-bottom brightness gradient for depth
vec3 skyColor(vec3 rd) {
  float t = 0.5 * (rd.y + 1.0);
  return uBackground * mix(0.65, 1.2, t);
}

vec4 fetchSphere(int i) {
  return texelFetch(uSpherePos, ivec2(i % uSpherePosTexW, i / uSpherePosTexW), 0);
}
int fetchIndex(int p) {
  return int(texelFetch(uIndexList, ivec2(p % uIndexListTexW, p / uIndexListTexW), 0).r);
}
vec2 fetchCell(int cellId) {
  return texelFetch(uCellRange, ivec2(cellId % uCellRangeTexW, cellId / uCellRangeTexW), 0).rg;
}

// --- PCG hash RNG ---
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float rnd(inout uint seed) {
  seed = pcg(seed);
  return float(seed) * (1.0 / 4294967296.0);
}

vec3 cosineHemisphere(vec3 n, inout uint seed) {
  float u1 = rnd(seed);
  float u2 = rnd(seed);
  float r = sqrt(u1);
  float phi = 2.0 * PI * u2;
  vec3 t = normalize(cross(abs(n.x) > 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), n));
  vec3 b = cross(n, t);
  return normalize(t * (r * cos(phi)) + b * (r * sin(phi)) + n * sqrt(max(0.0, 1.0 - u1)));
}

// nearest positive ray-sphere t, or -1.0
float intersectSphere(vec3 ro, vec3 rd, vec3 c, float rad) {
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float cc = dot(oc, oc) - rad * rad;
  float disc = b * b - cc;
  if (disc < 0.0) return -1.0;
  float sq = sqrt(disc);
  float t0 = -b - sq;
  if (t0 > EPS) return t0;
  float t1 = -b + sq;
  return t1 > EPS ? t1 : -1.0;
}

// Traverse the uniform grid; returns nearest hit t (or -1) and fills hitCenter.
float traceGrid(vec3 ro, vec3 rd, out vec3 hitCenter) {
  float gridSize = uCellSize * float(uGridRes);
  vec3 bmin = vec3(uBoundMin);
  vec3 bmax = bmin + gridSize;
  vec3 invD = 1.0 / rd;

  vec3 t0s = (bmin - ro) * invD;
  vec3 t1s = (bmax - ro) * invD;
  vec3 tsm = min(t0s, t1s);
  vec3 tbg = max(t0s, t1s);
  float tEnter = max(max(tsm.x, tsm.y), tsm.z);
  float tExit = min(min(tbg.x, tbg.y), tbg.z);
  if (tExit < max(tEnter, 0.0)) return -1.0;

  float tStart = max(tEnter, 0.0) + EPS;
  vec3 p = ro + rd * tStart;
  vec3 fcell = clamp(floor((p - bmin) / uCellSize), vec3(0.0), vec3(float(uGridRes - 1)));
  ivec3 cell = ivec3(fcell);

  ivec3 stepV = ivec3(sign(rd));
  vec3 cellWorld = bmin + fcell * uCellSize;
  vec3 tMaxPos = (cellWorld + uCellSize - ro) * invD;
  vec3 tMaxNeg = (cellWorld - ro) * invD;
  vec3 tMaxV = mix(tMaxNeg, tMaxPos, step(0.0, rd));
  vec3 tDeltaV = uCellSize * abs(invD);

  float tBest = TFAR;
  hitCenter = vec3(0.0);
  bool found = false;
  int last = uGridRes - 1;

  for (int s = 0; s < MAX_STEPS; s++) {
    int cellId = (cell.z * uGridRes + cell.y) * uGridRes + cell.x;
    vec2 range = fetchCell(cellId);
    int offset = int(range.x);
    int cnt = min(int(range.y), MAX_PER_CELL);
    for (int k = 0; k < cnt; k++) {
      int si = fetchIndex(offset + k);
      vec4 sp = fetchSphere(si);
      float th = intersectSphere(ro, rd, sp.xyz, sp.w);
      if (th > EPS && th < tBest) {
        tBest = th;
        hitCenter = sp.xyz;
        found = true;
      }
    }

    float tCellExit = min(min(tMaxV.x, tMaxV.y), tMaxV.z);
    if (found && tBest <= tCellExit) break;

    if (tMaxV.x < tMaxV.y) {
      if (tMaxV.x < tMaxV.z) { cell.x += stepV.x; tMaxV.x += tDeltaV.x; }
      else { cell.z += stepV.z; tMaxV.z += tDeltaV.z; }
    } else {
      if (tMaxV.y < tMaxV.z) { cell.y += stepV.y; tMaxV.y += tDeltaV.y; }
      else { cell.z += stepV.z; tMaxV.z += tDeltaV.z; }
    }
    if (cell.x < 0 || cell.y < 0 || cell.z < 0 ||
        cell.x > last || cell.y > last || cell.z > last) break;
  }

  return found ? tBest : -1.0;
}

// irradiance from the directional key lights at a surface normal
vec3 directLight(vec3 n) {
  vec3 c = vec3(AMBIENT);
  c += L0_COL * max(dot(n, L0_DIR), 0.0);
  c += L1_COL * max(dot(n, L1_DIR), 0.0);
  c += L2_COL * max(dot(n, L2_DIR), 0.0);
  return c;
}

// full shade of a primary hit: direct diffuse + one diffuse bounce (color bleed)
vec3 shade(vec3 ro, vec3 rd, float t, vec3 center, inout uint seed) {
  vec3 hp = ro + rd * t;
  vec3 n = normalize(hp - center);

  // direct diffuse, with an optional shadow ray on the key light
  float keyVis = 1.0;
#if SHADOWS
  {
    vec3 sc;
    float st = traceGrid(hp + n * (2.0 * EPS), L0_DIR, sc);
    keyVis = st > 0.0 ? 0.0 : 1.0;
  }
#endif
  vec3 direct = uAlbedo * (vec3(AMBIENT) +
    L0_COL * max(dot(n, L0_DIR), 0.0) * keyVis +
    L1_COL * max(dot(n, L1_DIR), 0.0) +
    L2_COL * max(dot(n, L2_DIR), 0.0));

  // one diffuse bounce: gather neighbour's lit colour (color bleeding).
  // randomize on  -> stochastic cosine-weighted sample (noisy, denoised over time)
  // randomize off -> deterministic bounce along the normal (noise-free, biased)
  vec3 bdir = uRandomize ? cosineHemisphere(n, seed) : n;
  vec3 bo = hp + n * (2.0 * EPS);
  vec3 bcenter;
  float bt = traceGrid(bo, bdir, bcenter);
  vec3 Li;
  if (bt > 0.0) {
    vec3 bhp = bo + bdir * bt;
    vec3 bn = normalize(bhp - bcenter);
    Li = uAlbedo * directLight(bn);
  } else {
    Li = skyColor(bdir);
  }
  // Lambertian cosine-weighted estimator: cos/pi and pi/cos cancel
  vec3 indirect = uAlbedo * Li;

  return direct + indirect;
}

void main() {
  vec4 world = uInvViewProj * vec4(vNDC, -1.0, 1.0);
  world /= world.w;
  vec3 ro = uCameraPos;
  vec3 rd = normalize(world.xyz - ro);

  // per-frame variation is what lets temporal accumulation average the noise down
  uint seed = uint(gl_FragCoord.x) * 1973u +
              uint(gl_FragCoord.y) * 9277u +
              uFrame * 26699u + 1u;

  vec3 color;
  vec3 center;
  float t = traceGrid(ro, rd, center);
  if (t < 0.0) {
    color = skyColor(rd);
  } else {
    color = vec3(0.0);
    for (int i = 0; i < SAMPLES; i++) {
      color += shade(ro, rd, t, center, seed);
    }
    color /= float(SAMPLES);
  }

  vec2 uv = vNDC * 0.5 + 0.5;
  vec3 hist = texture(uHistory, uv).rgb;
  vec3 result = mix(hist, color, uBlend);
  fragColor = vec4(result, 1.0);
}
