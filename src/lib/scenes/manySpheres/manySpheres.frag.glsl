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
uniform bool uIndirectEnabled; // false = direct lighting only (no bounce / color bleed)

#pragma glslify: GridParams = require(./shared/gridParams.glsl)
#pragma glslify: traceGrid = require(./shared/grid.glsl, GridParams=GridParams)
#pragma glslify: cosineHemisphere = require(./shared/cosineHemisphere.glsl)
#pragma glslify: directIrradiance = require(./shared/directIrradiance.glsl)
#pragma glslify: skyColor = require(./shared/skyColor.glsl)
#pragma glslify: keyLightDir = require(./shared/keyLightDir.glsl)

#define SAMPLES 1
#define SHADOWS 1   // 1 = trace a shadow ray for the key light (contact shadows)
#define EPS 1e-4

GridParams gridParams() {
  return GridParams(uGridRes, uBoundMin, uCellSize,
    uSpherePosTexW, uCellRangeTexW, uIndexListTexW);
}

// full shade of a primary hit: direct diffuse + one diffuse bounce (color bleed)
vec3 shade(vec3 ro, vec3 rd, float t, vec3 center, inout uint seed) {
  GridParams g = gridParams();
  vec3 hp = ro + rd * t;
  vec3 n = normalize(hp - center);

  // direct diffuse, with an optional shadow ray on the key light
  float keyVis = 1.0;
#if SHADOWS
  {
    vec3 sc;
    int si;
    float st = traceGrid(hp + n * (2.0 * EPS), keyLightDir(),
      uSpherePos, uCellRange, uIndexList, g, sc, si);
    keyVis = st > 0.0 ? 0.0 : 1.0;
  }
#endif
  vec3 direct = uAlbedo * directIrradiance(n, keyVis);

  // one diffuse bounce: gather neighbour's lit colour (color bleeding).
  // randomize on  -> stochastic cosine-weighted sample (noisy, denoised over time)
  // randomize off -> deterministic bounce along the normal (noise-free, biased)
  vec3 indirect = vec3(0.0);
  if (uIndirectEnabled) {
    vec3 bdir = uRandomize ? cosineHemisphere(n, seed) : n;
    vec3 bo = hp + n * (2.0 * EPS);
    vec3 bcenter;
    int bidx;
    float bt = traceGrid(bo, bdir, uSpherePos, uCellRange, uIndexList, g, bcenter, bidx);
    vec3 Li;
    if (bt > 0.0) {
      vec3 bhp = bo + bdir * bt;
      vec3 bn = normalize(bhp - bcenter);
      Li = uAlbedo * directIrradiance(bn, 1.0);
    } else {
      Li = skyColor(bdir, uBackground);
    }
    // Lambertian cosine-weighted estimator: cos/pi and pi/cos cancel
    indirect = uAlbedo * Li;
  }

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
  int centerIdx;
  GridParams g = gridParams();
  float t = traceGrid(ro, rd, uSpherePos, uCellRange, uIndexList, g, center, centerIdx);
  if (t < 0.0) {
    color = skyColor(rd, uBackground);
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
