#pragma glslify: Intersection = require(glsl-ray-sphere/intersection)
#pragma glslify: sphereIntersection = require(glsl-ray-sphere/rsi, Intersection=Intersection)

uniform vec3 uCameraPos;
uniform mat4 uInvViewProj;

varying vec2 vNDC;

const vec3 LIGHT_DIR = normalize(vec3(1.0, 1.5, 0.8));
const vec3 SPHERE_COLOR = vec3(0.85, 0.5, 0.2);
const vec3 BG_COLOR = vec3(0.15, 0.15, 0.18);

void main() {
  // Unproject NDC point to world space, then derive ray direction
  vec4 worldPos = uInvViewProj * vec4(vNDC, -1.0, 1.0);
  worldPos /= worldPos.w;
  vec3 rayDir = normalize(worldPos.xyz - uCameraPos);

  // Sphere at world origin, radius 1. Origin passed relative to sphere center.
  Intersection isect = sphereIntersection(uCameraPos, rayDir, 1.0);

  if (isect.hits == 0) {
    gl_FragColor = vec4(BG_COLOR, 1.0);
    return;
  }

  float t = isect.isInside ? isect.t1 : isect.t0;
  vec3 hitPos = uCameraPos + rayDir * t;
  vec3 normal = normalize(hitPos); // unit sphere at origin: normal == position

  float diffuse = max(dot(normal, LIGHT_DIR), 0.0);
  float ambient = 0.08;
  vec3 color = SPHERE_COLOR * (diffuse + ambient);

  gl_FragColor = vec4(color, 1.0);
}
