import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmbossService {
  // Emboss kernel - creates a 3D effect by highlighting edges
  private readonly customKernel = [
    [-2, -1, 0],
    [-1,  1, 1],
    [ 0,  1, 2]
  ];

  // Standard emboss kernel from documentation
  private readonly standardKernel = [
    [-1, -1, 0],
    [-1,  0, 1],
    [ 0,  1, 1]
  ];

  private applyKernel(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number
  ): Buffer {
    const result = Buffer.alloc(imageData.length);
    const size = 3;
    const offset = Math.floor(size / 2);

    // First, copy the original image to the result buffer
    for (let i = 0; i < imageData.length; i++) {
      result[i] = imageData[i];
    }

    // Apply emboss filter
    for (let y = offset; y < height - offset; y++) {
      for (let x = offset; x < width - offset; x++) {
        for (let c = 0; c < channels; c++) {
          let sum = 0;

          // Apply the kernel
          for (let ky = -offset; ky <= offset; ky++) {
            for (let kx = -offset; kx <= offset; kx++) {
              // Calculate source pixel coordinates with proper bounds checking
              const px = Math.min(Math.max(x + kx, 0), width - 1);
              const py = Math.min(Math.max(y + ky, 0), height - 1);

              // Get the kernel weight
              const weight = this.standardKernel[ky + offset][kx + offset];

              // Calculate the source pixel index
              const sourceIndex = (py * width + px) * channels + c;

              // Add weighted pixel value to sum
              sum += imageData[sourceIndex] * weight;
            }
          }

          // Add 128 to shift the range (typical for emboss to add a mid-gray)
          sum += 128;

          // Calculate the destination pixel index
          const index = (y * width + x) * channels + c;

          // Clamp the value to valid range
          result[index] = Math.min(255, Math.max(0, Math.round(sum)));
        }
      }
    }

    return result;
  }

  @MessagePattern({ cmd: 'emboss_image' })
  async embossImage(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFile = path.join(outputDir, 'emboss_image.png');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height, channels = 3 } = metadata;
      const imageBuffer = await image.raw().toBuffer();

      const filtered = this.applyKernel(imageBuffer, width!, height!, channels);

      await sharp(filtered, {
        raw: {
          width: width!,
          height: height!,
          channels,
        },
      })
        .png()
        .toFile(outputFile);

      return {
        success: true,
        message: 'Image embossed successfully',
        savedImagePath: outputFile,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Failed to apply filter',
        error: err.message,
      };
    }
  }
}
