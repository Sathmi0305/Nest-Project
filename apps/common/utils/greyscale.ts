import * as sharp from 'sharp';

export async function convertToGreyscale(imagePath: string): Promise<{ buffer: Buffer, width: number, height: number }> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });

  // Allocate buffer with the correct size (width * height for grayscale - 1 channel)
  const greyscaleBuffer = Buffer.alloc(info.width * info.height);

  // Process each pixel
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      // Calculate the index in the original image (RGB)
      const srcIdx = (y * info.width + x) * info.channels;

      // Get RGB values
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      // Calculate grayscale using the luminance formula (ITU-R BT.601)
      // Y = 0.299R + 0.587G + 0.114B
      // This is the standard used by MATLAB, Pillow, and OpenCV for better performance
      const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      // Set the grayscale value in the output buffer
      greyscaleBuffer[y * info.width + x] = grayValue;
    }
  }

  return {
    buffer: greyscaleBuffer,
    width: info.width,
    height: info.height
  };
}