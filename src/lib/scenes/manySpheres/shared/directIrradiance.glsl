#pragma glslify: keyLightDir = require(./keyLightDir.glsl)

// three directional lights (dir points toward the light); L0 is the key light
const vec3 L0_COL = vec3(1.0, 0.96, 0.9) * 1.5;
const vec3 L1_DIR = normalize(vec3(-0.7, 0.3, -0.4));
const vec3 L1_COL = vec3(0.55, 0.65, 0.85) * 0.7;
const vec3 L2_DIR = normalize(vec3(0.1, -0.6, 0.7));
const vec3 L2_COL = vec3(0.9, 0.7, 0.5) * 0.35;
const float AMBIENT = 0.02;

// Irradiance from the three directional lights at normal n.
// keyVis scales only the key light L0 (1.0 = lit, 0.0 = shadowed).
vec3 directIrradiance(vec3 n, float keyVis) {
  vec3 c = vec3(AMBIENT);
  c += L0_COL * max(dot(n, keyLightDir()), 0.0) * keyVis;
  c += L1_COL * max(dot(n, L1_DIR), 0.0);
  c += L2_COL * max(dot(n, L2_DIR), 0.0);
  return c;
}

#pragma glslify: export(directIrradiance)
