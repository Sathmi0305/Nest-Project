export function nonMaxSuppression(
  magnitude: Float32Array,
  direction: Float32Array,
  width: number,
  height: number
): Float32Array {
  const output = new Float32Array(width * height);

  // Convert radians to degrees and normalize to [0, 180)
  const angleDeg = new Float32Array(direction.length);
  for (let i = 0; i < direction.length; i++) {
    angleDeg[i] = ((direction[i] * 180) / Math.PI + 180) % 180;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = angleDeg[idx];
      const mag = magnitude[idx];

      let neighbor1 = 0;
      let neighbor2 = 0;

      // Determine neighbors based on gradient direction
      // Horizontal edge (0° or 180°)
      if ((0 <= angle && angle < 22.5) || (157.5 <= angle && angle <= 180)) {
        neighbor1 = magnitude[y * width + (x + 1)];
        neighbor2 = magnitude[y * width + (x - 1)];
      }
      // Diagonal edge (45° or 225°)
      else if (22.5 <= angle && angle < 67.5) {
        neighbor1 = magnitude[(y + 1) * width + (x - 1)];
        neighbor2 = magnitude[(y - 1) * width + (x + 1)];
      }
      // Vertical edge (90° or 270°)
      else if (67.5 <= angle && angle < 112.5) {
        neighbor1 = magnitude[(y + 1) * width + x];
        neighbor2 = magnitude[(y - 1) * width + x];
      }
      // Diagonal edge (135° or 315°)
      else if (112.5 <= angle && angle < 157.5) {
        neighbor1 = magnitude[(y - 1) * width + (x - 1)];
        neighbor2 = magnitude[(y + 1) * width + (x + 1)];
      }

      // Non-maximum suppression: keep the pixel only if it's a local maximum
      if (mag >= neighbor1 && mag >= neighbor2) {
        output[idx] = mag;
      } else {
        output[idx] = 0;
      }
    }
  }

  return output;
}
