import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class FloodFillService {
  private readonly logger = new Logger(FloodFillService.name);

  @MessagePattern({ cmd: 'flood_fill_image' })
  async floodFill(
    @Payload()
    data: {
      imagePath: string;
      sr: number;
      sc: number;
      newColor: [number, number, number];
      tolerance?: number; // Do not change the tolerance value(It is defined as 0 in the below code)
    },
  ) {
    const { imagePath, sr, sc, newColor, tolerance = 0 } = data;

    if (!fs.existsSync(imagePath)) {
      this.logger.error(`Image not found at path: ${imagePath}`);
      throw new Error('Image file not found');
    }

    const outputDir = path.join(process.cwd(), 'apps/enhancement/output_images');
    const outputFileName = `flood_filled_${path.basename(imagePath)}`;
    const outputPath = path.join(outputDir, outputFileName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height } = metadata;

      if (!width || !height) {
        throw new Error('Could not determine image dimensions');
      }

      const { data: rawBuffer, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { channels } = info;

      const outputBuffer = Buffer.from(rawBuffer);

      // Helper function to get the index of a pixel in the buffer
      const getIndex = (x: number, y: number) => (y * width + x) * channels;

      // Helper function to get the color of a pixel
      const getColor = (buffer: Buffer, x: number, y: number): number[] => {
        const i = getIndex(x, y);
        const color: number[] = [];
        for (let c = 0; c < channels; c++) {
          color.push(buffer[i + c]);
        }
        return color;
      };

      // Helper function to set the color of a pixel
      const setColor = (buffer: Buffer, x: number, y: number, color: number[]) => {
        const i = getIndex(x, y);
        for (let c = 0; c < channels; c++) {
          buffer[i + c] = color[c];
        }
      };

      // Check if two colors are within tolerance
      const isWithinTolerance = (a: number[], b: number[]): boolean => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          if (Math.abs(a[i] - b[i]) > tolerance) {
            return false;
          }
        }
        return true;
      };

      // Check if coordinates are within image bounds
      if (sc < 0 || sc >= width || sr < 0 || sr >= height) {
        throw new Error(`Starting coordinates (${sc},${sr}) out of image bounds (${width}x${height})`);
      }

      // Get the original color at the starting point
      const originalColor = getColor(rawBuffer, sc, sr);
      const newColorArray = newColor.slice(0, channels);

      // If the original color is already the target color, no need to fill
      if (isWithinTolerance(originalColor, newColorArray) && tolerance === 0) {
        return {
          message: 'Original and new color are the same. Nothing changed.',
          outputPath
        };
      }

      // Initialize the queue with the starting point
      const queue: [number, number][] = [[sc, sr]];
      const visited = new Set<string>();
      visited.add(`${sc},${sr}`);

      // Define the four directions to check (right, left, down, up)
      const dx = [1, -1, 0, 0];
      const dy = [0, 0, 1, -1];

      // Perform the flood fill using BFS (Breadth-First Search)
      // This is the standard algorithm for flood fill as described in computer science literature
      let pixelsFilled = 0;
      while (queue.length > 0) {
        const [x, y] = queue.shift()!;

        // Set the color at the current pixel
        setColor(outputBuffer, x, y, newColorArray);
        pixelsFilled++;

        // Check all four adjacent pixels (up, down, left, right)
        // This is the 4-connected approach which is standard for flood fill
        for (let i = 0; i < 4; i++) {
          const nx = x + dx[i];
          const ny = y + dy[i];
          const key = `${nx},${ny}`;

          // Check if the pixel is within bounds and not visited
          if (
            nx >= 0 && nx < width &&
            ny >= 0 && ny < height &&
            !visited.has(key)
          ) {
            // Check if the color is similar to the original color
            const pixelColor = getColor(rawBuffer, nx, ny);
            if (isWithinTolerance(pixelColor, originalColor)) {
              queue.push([nx, ny]);
              visited.add(key);
            }
          }
        }
      }

      await sharp(outputBuffer, {
        raw: { width, height, channels },
      })
        .toFile(outputPath);

      return {
        message: `Flood fill applied successfully. ${pixelsFilled} pixels changed.`,
        outputPath,
        pixelsFilled,
      };
    } catch (error) {
      this.logger.error(`Error applying flood fill: ${error.message}`);
      throw error;
    }
  }
}