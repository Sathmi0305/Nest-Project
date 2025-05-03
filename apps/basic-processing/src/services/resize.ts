/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ResizeService {
  @MessagePattern({ cmd: 'resize_image' })
  async resize(data: { imagePath: string; width: number; height: number }) {
    try {
      const { imagePath, width, height } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = 'resized_image.png';
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const inputImage = await fs.promises.readFile(imagePath);
      const { data: inputBuffer, info: inputInfo } = await sharp(inputImage).raw().toBuffer({ resolveWithObject: true });

      const resizedBuffer = this.bilinearInterpolation(inputBuffer, inputInfo.height, inputInfo.width, height, width);

      // Save the resized image
      await sharp(resizedBuffer, {
        raw: {
          width: width,
          height: height,
          channels: inputInfo.channels,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image resized successfully',
        savedImagePath: outputFilePath,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private bilinearInterpolation(
    inputBuffer: Buffer,
    inputHeight: number,
    inputWidth: number,
    outputHeight: number,
    outputWidth: number
  ): Buffer {
    // Determine the number of channels (assuming RGB or RGBA)
    const channels = inputBuffer.length / (inputWidth * inputHeight);
    const outputBuffer = Buffer.alloc(outputWidth * outputHeight * channels);

    // Calculate scaling factors
    const xScale = inputWidth / outputWidth;
    const yScale = inputHeight / outputHeight;

    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        // Calculate the source position with centered sampling
        const srcX = (x + 0.5) * xScale - 0.5;
        const srcY = (y + 0.5) * yScale - 0.5;

        // Get the four surrounding pixels
        const x1 = Math.max(Math.floor(srcX), 0);
        const y1 = Math.max(Math.floor(srcY), 0);
        const x2 = Math.min(Math.ceil(srcX), inputWidth - 1);
        const y2 = Math.min(Math.ceil(srcY), inputHeight - 1);

        // Calculate interpolation weights
        const xWeight = srcX - x1;
        const yWeight = srcY - y1;

        // For each channel
        for (let c = 0; c < channels; c++) {
          // Get the four pixel values for this channel
          const topLeft = inputBuffer[(y1 * inputWidth + x1) * channels + c];
          const topRight = inputBuffer[(y1 * inputWidth + x2) * channels + c];
          const bottomLeft = inputBuffer[(y2 * inputWidth + x1) * channels + c];
          const bottomRight = inputBuffer[(y2 * inputWidth + x2) * channels + c];

          // Perform bilinear interpolation
          const top = topLeft * (1 - xWeight) + topRight * xWeight;
          const bottom = bottomLeft * (1 - xWeight) + bottomRight * xWeight;
          const pixel = Math.round(top * (1 - yWeight) + bottom * yWeight);

          // Set the output pixel
          outputBuffer[(y * outputWidth + x) * channels + c] = pixel;
        }
      }
    }

    return outputBuffer;
  }
}