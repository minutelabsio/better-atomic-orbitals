out vec2 vNDC;

void main() {
  // PlaneGeometry(2,2) corners are already in clip space (±1, ±1, 0)
  vNDC = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
