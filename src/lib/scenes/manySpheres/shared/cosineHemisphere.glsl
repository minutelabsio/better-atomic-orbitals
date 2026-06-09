#pragma glslify: rnd = require(./rng.glsl)

const float PI = 3.14159265359;

// cosine-weighted hemisphere sample about normal n
vec3 cosineHemisphere(vec3 n, inout uint seed) {
  float u1 = rnd(seed);
  float u2 = rnd(seed);
  float r = sqrt(u1);
  float phi = 2.0 * PI * u2;
  vec3 t = normalize(cross(abs(n.x) > 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), n));
  vec3 b = cross(n, t);
  return normalize(t * (r * cos(phi)) + b * (r * sin(phi)) + n * sqrt(max(0.0, 1.0 - u1)));
}

#pragma glslify: export(cosineHemisphere)
