// uv of sphere number index in a per-sphere texture (one texel per sphere, row-major,
// sampled with nearest filtering). For texture(): texelFetch must stay confined
// to grid.glsl, because glslify mangles a built-in used in several units.
vec2 sphereTexelUv(int index, int texW, int texH) {
  return (vec2(index % texW, index / texW) + 0.5) / vec2(float(texW), float(texH));
}

#pragma glslify: export(sphereTexelUv)
