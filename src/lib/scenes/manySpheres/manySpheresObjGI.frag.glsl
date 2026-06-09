precision highp float;
precision highp int;

in vec2 vNDC;
out vec4 fragColor;

// Object-space GI primary pass. Direct lighting is computed analytically per
// pixel (with a key-light shadow ray, as in the screen-space scene); the
// indirect (one-bounce) term is read from the per-sphere buffer accumulated by
// manySpheresProbe.frag. No screen-space temporal history is needed, so there
// is no motion blur.

uniform vec3 uCameraPos;
uniform mat4 uInvViewProj;

// --- grid / data textures ---
uniform sampler2D uSpherePos;
uniform sampler2D uCellRange;
uniform sampler2D uIndexList;
uniform int uSpherePosTexW;
uniform int uSphereTexH;
uniform int uCellRangeTexW;
uniform int uIndexListTexW;
uniform int uGridRes;
uniform float uBoundMin;
uniform float uCellSize;

uniform vec3 uAlbedo;
uniform vec3 uBackground;

// per-sphere accumulated indirect, indexed by sphere index
uniform sampler2D uIndirect;

#pragma glslify: GridParams = require(./shared/gridParams.glsl)
#pragma glslify: traceGrid = require(./shared/grid.glsl, GridParams=GridParams)
#pragma glslify: directIrradiance = require(./shared/directIrradiance.glsl)
#pragma glslify: skyColor = require(./shared/skyColor.glsl)
#pragma glslify: keyLightDir = require(./shared/keyLightDir.glsl)

#define SHADOWS 1
#define EPS 1e-4

GridParams gridParams() {
  return GridParams(uGridRes, uBoundMin, uCellSize,
    uSpherePosTexW, uCellRangeTexW, uIndexListTexW);
}

// Fetch a per-sphere texel. Uses texture() (not texelFetch) with a nearest-
// filtered sampler: texelFetch must stay confined to grid.glsl, because glslify
// mangles a built-in that appears in more than one require-inlined unit.
vec3 fetchIndirect(int index) {
  int w = uSpherePosTexW;
  vec2 uv = (vec2(index % w, index / w) + 0.5) / vec2(float(w), float(uSphereTexH));
  return texture(uIndirect, uv).rgb;
}

void main() {
  vec4 world = uInvViewProj * vec4(vNDC, -1.0, 1.0);
  world /= world.w;
  vec3 ro = uCameraPos;
  vec3 rd = normalize(world.xyz - ro);

  GridParams g = gridParams();
  vec3 center;
  int idx;
  float t = traceGrid(ro, rd, uSpherePos, uCellRange, uIndexList, g, center, idx);

  vec3 color;
  if (t < 0.0) {
    color = skyColor(rd, uBackground);
  } else {
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
    vec3 indirect = fetchIndirect(idx);
    color = direct + indirect;
  }

  fragColor = vec4(color, 1.0);
}
