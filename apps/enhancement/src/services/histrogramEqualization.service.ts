import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { convertToGreyscale } from '../../../common/utils/greyscale';

@Injectable()
export class HistogramEqualizationService {
  @MessagePattern({ cmd: 'histogram_equalization_image' })
  async equalizeHistogram(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/enhancement/output_images');
      const outputFileName = 'histogram_equalized.png';
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Use Sharp's built-in grayscale function to ensure consistent results
      // This uses the ITU-R BT.601 standard (Y = 0.299R + 0.587G + 0.114B)
      const grayscaleImage = await sharp(imagePath)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const raw = grayscaleImage.data;
      const width = grayscaleImage.info.width;
      const height = grayscaleImage.info.height;

      // Calculate histogram
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < raw.length; i++) {
        histogram[raw[i]]++;
      }

      // Calculate cumulative distribution function (CDF)
      const cdf = new Array(256).fill(0);
      cdf[0] = histogram[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
      }

      const totalPixels = raw.length;
      const L = 256; // Number of intensity levels

      // Find the minimum non-zero value in the CDF
      let cdfMin = 0;
      for (let i = 0; i < 256; i++) {
        if (cdf[i] > 0) {
          cdfMin = cdf[i];
          break;
        }
      }

      // Apply histogram equalization formula
      const equalized = Buffer.alloc(raw.length);
      for (let i = 0; i < raw.length; i++) {
        const originalIntensity = raw[i];
        // Apply the histogram equalization formula: h(v) = round((cdf(v) - cdfMin) / (totalPixels - cdfMin) * (L - 1))
        // Make sure we don't divide by zero
        const denominator = totalPixels - cdfMin;
        const newIntensity = denominator === 0
          ? originalIntensity
          : Math.round(((cdf[originalIntensity] - cdfMin) / denominator) * (L - 1));
        equalized[i] = newIntensity;
      }

      // Use Sharp to save the equalized image
      await sharp(equalized, {
        raw: {
          width: width,
          height: height,
          channels: 1,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Histogram equalization complete',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
