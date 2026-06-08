varying vec2 vNDC;

void main() {
  vNDC = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
