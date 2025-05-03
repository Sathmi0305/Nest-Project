import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class HarrisSharpService {
  private readonly logger = new Logger(HarrisSharpService.name);

  @MessagePattern({ cmd: 'harris_corner_detection_image' })
  async detectCorners(
    @Payload()
    data: {
      imagePath: string;
      k?: number;          // Harris free parameter (default 0.04)
      windowSize?: number; // Gaussian window size (default 3)
      thresh?: number;     // Response threshold (default 1e-5)
    },
  ) {
    const { imagePath, k = 0.06, windowSize = 3, thresh = 0.01 } = data;
    if (!fs.existsSync(imagePath)) {
      return { error: 'Image not found', statusCode: 404 };
    }

    // Load & preprocess image
    const input = fs.readFileSync(imagePath);
    const { data: buf, info } = await sharp(input)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info; // channels should be 1
    const img = Float32Array.from(buf).map(v => v / 255);

    // Helper to index (x,y) in flat array
    const idx = (x: number, y: number) => y * width + x;

    // Correct Sobel kernels
    const Sx = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    const Sy = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    // Convolution
    function convolve(kernel: number[][]): Float32Array {
      const out = new Float32Array(width * height);
      const kSize = kernel.length;
      const kHalf = Math.floor(kSize / 2);

      for (let y = kHalf; y < height - kHalf; y++) {
        for (let x = kHalf; x < width - kHalf; x++) {
          let sum = 0;

          // Apply the kernel
          for (let ky = -kHalf; ky <= kHalf; ky++) {
            for (let kx = -kHalf; kx <= kHalf; kx++) {
              const ix = x + kx;
              const iy = y + ky;

              // Get pixel value and apply kernel weight
              if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
                const pixelValue = img[idx(ix, iy)];
                sum += pixelValue * kernel[ky + kHalf][kx + kHalf];
              }
            }
          }

          out[idx(x, y)] = sum;
        }
      }
      return out;
    }

    // Compute gradients
    const dx = convolve(Sx);
    const dy = convolve(Sy);

    // Compute products and apply Gaussian blur (box blur for simplicity)
    const A = new Float32Array(width * height);
    const B = new Float32Array(width * height);
    const C = new Float32Array(width * height);
    for (let i = 0; i < A.length; i++) {
      A[i] = dx[i] * dx[i];
      B[i] = dy[i] * dy[i];
      C[i] = dx[i] * dy[i];
    }

    // Simple box‑blur of size windowSize
    function boxBlur(dataArr: Float32Array): Float32Array {
      const out = new Float32Array(width * height);
      const w = windowSize;
      const r = Math.floor(w / 2);
      const area = w * w; // Total number of pixels in the window

      for (let y = r; y < height - r; y++) {
        for (let x = r; x < width - r; x++) {
          let sum = 0;

          // Sum all pixels in the window
          for (let yy = -r; yy <= r; yy++) {
            for (let xx = -r; xx <= r; xx++) {
              const ix = x + xx;
              const iy = y + yy;

              if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
                sum += dataArr[idx(ix, iy)];
              }
            }
          }

          // Average the sum
          out[idx(x, y)] = sum / area;
        }
      }
      return out;
    }

    const Sxx = boxBlur(A);
    const Syy = boxBlur(B);
    const Sxy = boxBlur(C);

    // Compute R and collect corners
    const R = new Float32Array(width * height);
    for (let i = 0; i < R.length; i++) {
      const det = Sxx[i] * Syy[i] - Sxy[i] * Sxy[i]; // Correct determinant calculation
      const trace = Sxx[i] + Syy[i];
      R[i] = det - k * trace * trace; // Apply k to squared trace for better results
    }

    // Non-maximum suppression + threshold
    const corners: { x: number; y: number; r: number }[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = idx(x, y);
        const val = R[i];

        // Check if the value is above threshold
        if (val > thresh) {
          // Check if it's a local maximum (non-maximum suppression)
          if (
            val > R[idx(x - 1, y)] &&
            val > R[idx(x + 1, y)] &&
            val > R[idx(x, y - 1)] &&
            val > R[idx(x, y + 1)] &&
            val > R[idx(x - 1, y - 1)] &&
            val > R[idx(x + 1, y - 1)] &&
            val > R[idx(x - 1, y + 1)] &&
            val > R[idx(x + 1, y + 1)]
          ) {
            corners.push({ x, y, r: val });
          }
        }
      }
    }

    // Draw on a PNG via raw buffer
    const outBuf = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const src = img[idx(x, y)] * 255;
        const dstIdx = (y * width + x) * 3;
        outBuf[dstIdx] = src;
        outBuf[dstIdx + 1] = src;
        outBuf[dstIdx + 2] = src;
      }
    }

    // Draw larger green circles at corners
    const circleRadius = 5; // Increase for bigger circles
    corners.forEach(pt => {
      for (let yy = -circleRadius; yy <= circleRadius; yy++) {
        for (let xx = -circleRadius; xx <= circleRadius; xx++) {
          const nx = pt.x + xx;
          const ny = pt.y + yy;

          // Check if the pixel is within image bounds
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const dist = Math.sqrt(xx * xx + yy * yy);

            // Draw only pixels that form a circle
            if (dist <= circleRadius) {
              const d = (ny * width + nx) * 3;
              outBuf[d] = 0;       // Red channel
              outBuf[d + 1] = 255; // Green channel (max intensity)
              outBuf[d + 2] = 0;   // Blue channel
            }
          }
        }
      }
    });

    const outputDir = path.join(process.cwd(), 'apps/feature-detection/output_images');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outPath = path.join(outputDir, `harris_sharp_${path.basename(imagePath)}`);
    await sharp(outBuf, { raw: { width, height, channels: 3 } })
      .png()
      .toFile(outPath);

    this.logger.log(`Detected ${corners.length} corners, saved to ${outPath}`);
    return { corners: corners.slice(0, 20), outputPath: outPath };
  }
}
