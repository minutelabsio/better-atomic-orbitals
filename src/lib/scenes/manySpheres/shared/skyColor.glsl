// background + environment (also the indirect light when a bounce ray misses):
// the chosen colour with a soft top-to-bottom brightness gradient for depth
vec3 skyColor(vec3 rd, vec3 bg) {
  float t = 0.5 * (rd.y + 1.0);
  return bg * mix(0.65, 1.2, t);
}

#pragma glslify: export(skyColor)
