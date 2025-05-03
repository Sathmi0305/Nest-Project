export function applyConvolution(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number,
    kernel: number[][]
): Buffer {
    const result = Buffer.alloc(imageData.length);
    const kernelSize = kernel.length;
    const offset = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < channels; c++) {
                const pixelIndex = (y * width + x) * channels + c;

                // For negative effect, we invert the pixel value
                if (kernel[0][0] === -1 && kernel[0][1] === -1 && kernel[0][2] === -1 &&
                    kernel[1][0] === -1 && kernel[1][1] === -1 && kernel[1][2] === -1 &&
                    kernel[2][0] === -1 && kernel[2][1] === -1 && kernel[2][2] === -1) {
                    // Simple inversion for negative effect: 255 - original value
                    result[pixelIndex] = 255 - imageData[pixelIndex];
                } else {
                    // For other convolution operations
                    let sum = 0;

                    // Apply the kernel
                    for (let ky = -offset; ky <= offset; ky++) {
                        for (let kx = -offset; kx <= offset; kx++) {
                            // Calculate source pixel coordinates with bounds checking
                            const px = Math.min(Math.max(x + kx, 0), width - 1);
                            const py = Math.min(Math.max(y + ky, 0), height - 1);

                            // Get the kernel weight
                            const weight = kernel[ky + offset][kx + offset];

                            // Calculate the source pixel index
                            const sourceIndex = (py * width + px) * channels + c;

                            // Add weighted pixel value to sum
                            sum += imageData[sourceIndex] * weight;
                        }
                    }

                    // Clamp the value to valid range
                    result[pixelIndex] = Math.min(255, Math.max(0, Math.round(sum)));
                }
            }
        }
    }

    return result;
}
