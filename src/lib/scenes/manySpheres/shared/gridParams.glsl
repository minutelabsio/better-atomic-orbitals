// Scalar parameters describing the uniform grid + the data-texture widths.
// (Samplers can't live in a GLSL struct, so they are passed alongside this.)
struct GridParams {
  int gridRes;
  float boundMin;
  float cellSize;
  int spherePosTexW;
  int cellRangeTexW;
  int indexListTexW;
};

#pragma glslify: export(GridParams)
