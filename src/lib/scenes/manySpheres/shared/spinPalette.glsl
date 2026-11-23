// Color for a spin direction, from its component along the quantization axis
// (cos of the tilt). Linear in the tilt angle: palette[0] along the axis
// (spin up), palette[1] sideways, palette[2] against it (spin down).
vec3 spinPalette(float alongAxis, mat3 palette) {
  float tilt = acos(clamp(alongAxis, -1.0, 1.0)) / 1.5707963268;
  return tilt < 1.0
    ? mix(palette[0], palette[1], tilt)
    : mix(palette[1], palette[2], tilt - 1.0);
}

#pragma glslify: export(spinPalette)
