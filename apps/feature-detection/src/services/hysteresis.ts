export function hysteresis(strong: Uint8Array, weak: Uint8Array, width: number, height: number): Buffer {
  // Start with strong edges
  const result = Buffer.from(strong);

  // Helper function to check if a pixel is a strong edge
  const isStrong = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const idx = y * width + x;
    return strong[idx] === 255;
  };

  // Check 8-connected neighbors
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

  // Promote weak edges connected to strong edges
  let edgeFound = true;
  while (edgeFound) {
    edgeFound = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // If this is a weak edge
        if (weak[idx] === 255 && result[idx] === 0) {

          // Check if any neighbor is a strong edge
          for (let i = 0; i < 8; i++) {
            const nx = x + dx[i];
            const ny = y + dy[i];

            if (isStrong(nx, ny)) {
              // Promote to strong edge
              result[idx] = 255;
              edgeFound = true;
              break;
            }
          }
        }
      }
    }
  }

  return result;
}