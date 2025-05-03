export function doubleThreshold(input: Float32Array, width: number, height: number, lowThreshold: number, highThreshold: number): {
  strongEdges: Uint8Array;
  weakEdges: Uint8Array;
} {
  const strong = new Uint8Array(width * height);
  const weak = new Uint8Array(width * height);

  // Convert percentage thresholds to actual values
  const high = highThreshold;
  const low = lowThreshold;

  // Apply double threshold
  for (let i = 0; i < input.length; i++) {
    if (input[i] >= high) {
      // Strong edge
      strong[i] = 255;
    } else if (input[i] >= low) {
      // Weak edge
      weak[i] = 255;
    }
  }

  return { strongEdges: strong, weakEdges: weak };
}
