precision highp float;
precision highp int;

in vec2 vNDC;
out vec4 fragColor;

// One fragment per sphere: this pass is rendered into a target sized like the
// sphere-position texture, so gl_FragCoord maps directly to a sphere index.
// It estimates that sphere's indirect (one-bounce) lighting and accumulates it
// with an exponential moving average keyed on the sphere index. Because the key
// is the index (not a screen pixel), the average is motion-invariant: a sphere
// keeps its accumulated colour as it orbits, so there is no reprojection and no
// motion blur.

// --- grid / data textures ---
uniform sampler2D uSpherePos;   // RGBA32F: xyz centre, w radius
uniform sampler2D uCellRange;
uniform sampler2D uIndexList;
uniform int uSpherePosTexW;
uniform int uSphereTexH;
uniform int uCellRangeTexW;
uniform int uIndexListTexW;
uniform int uGridRes;
uniform float uBoundMin;
uniform float uCellSize;
uniform int uCount;

uniform vec3 uAlbedo;
uniform vec3 uBackground;

// per-sphere indirect history (EMA), same layout as the sphere-position texture
uniform sampler2D uIndirectHistory;
uniform float uBlend;   // EMA weight for the current sample (1.0 = reset)
uniform uint uFrame;

#pragma glslify: GridParams = require(./shared/gridParams.glsl)
#pragma glslify: traceGrid = require(./shared/grid.glsl, GridParams=GridParams)
#pragma glslify: rnd = require(./shared/rng.glsl)
#pragma glslify: cosineHemisphere = require(./shared/cosineHemisphere.glsl)
#pragma glslify: directIrradiance = require(./shared/directIrradiance.glsl)
#pragma glslify: skyColor = require(./shared/skyColor.glsl)

#define EPS 1e-4
#define PI 3.14159265359

GridParams gridParams() {
  return GridParams(uGridRes, uBoundMin, uCellSize,
    uSpherePosTexW, uCellRangeTexW, uIndexListTexW);
}

// uniform random direction on the unit sphere
vec3 randomDir(inout uint seed) {
  float z = rnd(seed) * 2.0 - 1.0;
  float a = rnd(seed) * 2.0 * PI;
  float r = sqrt(max(0.0, 1.0 - z * z));
  return vec3(r * cos(a), r * sin(a), z);
}

void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  int index = texel.y * uSpherePosTexW + texel.x;
  // texture() with nearest-filtered samplers (not texelFetch): the texelFetch
  // built-in must stay confined to grid.glsl or glslify mangles it (it gets
  // renamed when a built-in appears in more than one require-inlined unit).
  vec2 uv = gl_FragCoord.xy / vec2(float(uSpherePosTexW), float(uSphereTexH));
  vec3 prev = texture(uIndirectHistory, uv).rgb;

  // padding texels beyond the sphere count carry no data; keep them stable
  if (index >= uCount) {
    fragColor = vec4(prev, 1.0);
    return;
  }

  vec4 sp = texture(uSpherePos, uv);
  vec3 center = sp.xyz;
  float radius = sp.w;

  uint seed = uint(index) * 9781u + uFrame * 6271u + 1u;

  // one random surface point + one cosine-weighted bounce (view-independent)
  vec3 nrm = randomDir(seed);
  vec3 hp = center + nrm * radius;
  vec3 bdir = cosineHemisphere(nrm, seed);
  vec3 bo = hp + nrm * (2.0 * EPS);

  GridParams g = gridParams();
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
  // matches the screen-space shader's indirect term (uAlbedo * Li)
  vec3 indirectSample = uAlbedo * Li;

  vec3 result = mix(prev, indirectSample, uBlend);
  fragColor = vec4(result, 1.0);
}
