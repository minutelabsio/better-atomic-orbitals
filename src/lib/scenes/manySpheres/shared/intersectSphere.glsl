const float EPS = 1e-4;

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

#pragma glslify: export(intersectSphere)
