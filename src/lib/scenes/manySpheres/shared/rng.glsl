// PCG hash RNG. rnd advances the seed in place and returns a float in [0,1).
//
// NOTE: no 'u'-suffixed integer literals appear below. glslify's tokenizer
// mis-parses suffixed literals (e.g. 747796405u) as identifiers inside a
// required module and mangles them (-> 747796405u_0), which is invalid GLSL.
// So uint constants are written via uint(...) casts, and shift counts as plain
// ints. 2891336453 exceeds INT_MAX, so it is built from in-range pieces.
const uint PCG_MULT = uint(747796405);
const uint PCG_INCR = uint(1445668226) * uint(2) + uint(1); // = 2891336453
const uint PCG_XMUL = uint(277803737);

uint pcg(uint v) {
  uint state = v * PCG_MULT + PCG_INCR;
  uint word = ((state >> ((state >> 28) + uint(4))) ^ state) * PCG_XMUL;
  return (word >> 22) ^ word;
}
float rnd(inout uint seed) {
  seed = pcg(seed);
  return float(seed) * (1.0 / 4294967296.0);
}

#pragma glslify: export(rnd)
