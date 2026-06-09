precision highp float;

in vec2 vNDC;
out vec4 fragColor;

uniform sampler2D uTex;

void main() {
  vec2 uv = vNDC * 0.5 + 0.5;
  vec3 c = texture(uTex, uv).rgb;
  // gentle exponential tonemap: 0 stays black, asymptotes to 1, tames GI fireflies
  c = vec3(1.0) - exp(-c);
  fragColor = vec4(c, 1.0);
}
