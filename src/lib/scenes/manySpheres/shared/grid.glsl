#pragma glslify: intersectSphere = require(./intersectSphere.glsl)

const float EPS = 1e-4;
const float TFAR = 1e30;
const int MAX_STEPS = 256;
const int MAX_PER_CELL = 64;

// GridParams type is supplied by the consumer via a glslify dependency binding.

vec4 fetchSphere(sampler2D spherePos, int w, int i) {
  return texelFetch(spherePos, ivec2(i % w, i / w), 0);
}
int fetchIndex(sampler2D indexList, int w, int p) {
  return int(texelFetch(indexList, ivec2(p % w, p / w), 0).r);
}
vec2 fetchCell(sampler2D cellRange, int w, int cellId) {
  return texelFetch(cellRange, ivec2(cellId % w, cellId / w), 0).rg;
}

// Amanatides-Woo DDA traversal of the uniform grid.
// Returns nearest hit t (or -1.0) and fills hitCenter with that sphere's centre.
float traceGrid(vec3 ro, vec3 rd,
    sampler2D spherePos, sampler2D cellRange, sampler2D indexList,
    GridParams g, out vec3 hitCenter) {
  float gridSize = g.cellSize * float(g.gridRes);
  vec3 bmin = vec3(g.boundMin);
  vec3 bmax = bmin + gridSize;
  vec3 invD = 1.0 / rd;

  vec3 t0s = (bmin - ro) * invD;
  vec3 t1s = (bmax - ro) * invD;
  vec3 tsm = min(t0s, t1s);
  vec3 tbg = max(t0s, t1s);
  float tEnter = max(max(tsm.x, tsm.y), tsm.z);
  float tExit = min(min(tbg.x, tbg.y), tbg.z);
  if (tExit < max(tEnter, 0.0)) return -1.0;

  float tStart = max(tEnter, 0.0) + EPS;
  vec3 p = ro + rd * tStart;
  vec3 fcell = clamp(floor((p - bmin) / g.cellSize), vec3(0.0), vec3(float(g.gridRes - 1)));
  ivec3 cell = ivec3(fcell);

  ivec3 stepV = ivec3(sign(rd));
  vec3 cellWorld = bmin + fcell * g.cellSize;
  vec3 tMaxPos = (cellWorld + g.cellSize - ro) * invD;
  vec3 tMaxNeg = (cellWorld - ro) * invD;
  vec3 tMaxV = mix(tMaxNeg, tMaxPos, step(0.0, rd));
  vec3 tDeltaV = g.cellSize * abs(invD);

  float tBest = TFAR;
  hitCenter = vec3(0.0);
  bool found = false;
  int last = g.gridRes - 1;

  for (int s = 0; s < MAX_STEPS; s++) {
    int cellId = (cell.z * g.gridRes + cell.y) * g.gridRes + cell.x;
    vec2 range = fetchCell(cellRange, g.cellRangeTexW, cellId);
    int offset = int(range.x);
    int cnt = min(int(range.y), MAX_PER_CELL);
    for (int k = 0; k < cnt; k++) {
      int si = fetchIndex(indexList, g.indexListTexW, offset + k);
      vec4 sp = fetchSphere(spherePos, g.spherePosTexW, si);
      float th = intersectSphere(ro, rd, sp.xyz, sp.w);
      if (th > EPS && th < tBest) {
        tBest = th;
        hitCenter = sp.xyz;
        found = true;
      }
    }

    float tCellExit = min(min(tMaxV.x, tMaxV.y), tMaxV.z);
    if (found && tBest <= tCellExit) break;

    if (tMaxV.x < tMaxV.y) {
      if (tMaxV.x < tMaxV.z) { cell.x += stepV.x; tMaxV.x += tDeltaV.x; }
      else { cell.z += stepV.z; tMaxV.z += tDeltaV.z; }
    } else {
      if (tMaxV.y < tMaxV.z) { cell.y += stepV.y; tMaxV.y += tDeltaV.y; }
      else { cell.z += stepV.z; tMaxV.z += tDeltaV.z; }
    }
    if (cell.x < 0 || cell.y < 0 || cell.z < 0 ||
        cell.x > last || cell.y > last || cell.z > last) break;
  }

  return found ? tBest : -1.0;
}

#pragma glslify: export(traceGrid)
