// Direction toward the key light (L0). Shared so primary passes can trace a
// shadow ray toward it without duplicating the constant.
const vec3 KEY_LIGHT_DIR = normalize(vec3(0.6, 0.9, 0.5));

vec3 keyLightDir() {
  return KEY_LIGHT_DIR;
}

#pragma glslify: export(keyLightDir)
