import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RotateService {
  private rotatePixels(
    inputBuffer: Buffer,
    width: number,
    height: number,
    angle: number,
    channels: number = 3
  ): Buffer {
    // Create a properly sized output buffer
    const outputBuffer = Buffer.alloc(width * height * channels);

    // Convert angle to radians
    const radian = (angle * Math.PI) / 180;

    // Calculate the center of the image
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize output buffer with black (0)
    outputBuffer.fill(0);

    // Process each pixel in the output image
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate position relative to center
        const dx = x - centerX;
        const dy = y - centerY;

        // Apply rotation transformation (inverse mapping)
        // x' = cos(θ) * (x-cx) + sin(θ) * (y-cy) + cx
        // y' = -sin(θ) * (x-cx) + cos(θ) * (y-cy) + cy
        const sourceX = Math.round(Math.cos(radian) * dx + Math.sin(radian) * dy + centerX);
        const sourceY = Math.round(-Math.sin(radian) * dx + Math.cos(radian) * dy + centerY);

        // Check if the source coordinates are within bounds
        if (
          sourceX >= 0 &&
          sourceX < width &&
          sourceY >= 0 &&
          sourceY < height
        ) {
          // Copy each channel
          for (let c = 0; c < channels; c++) {
            const sourceIndex = (sourceY * width + sourceX) * channels + c;
            const targetIndex = (y * width + x) * channels + c;
            outputBuffer[targetIndex] = inputBuffer[sourceIndex];
          }
        }
      }
    }

    return outputBuffer;
  }

  @MessagePattern({ cmd: 'rotate_image' })
  async rotate(data: { imagePath: string; angle: number }) {
    try {
      const { imagePath, angle } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = `rotated_${angle * 2}_image.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height, channels = 3 } = metadata;

      const rawData = await image.raw().toBuffer();

      const rotatedBuffer = this.rotatePixels(rawData, width!, height!, angle, channels);

      // Save the rotated image
      await sharp(rotatedBuffer, {
        raw: {
          width: width!,
          height: height!,
          channels: channels
        }
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image rotated successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Rotation error:', error);
      return {
        success: false,
        message: 'Failed to rotate image',
        error: error.message,
      };
    }
  }
}