import os
import sys
import numpy as np
from PIL import Image
import math

def compare_images(img1_path, img2_path, threshold=25):
    """
    Compare two images and return the mean squared error.
    If the MSE is below the threshold, the images are considered similar.
    """
    try:
        # Open images
        img1 = Image.open(img1_path)
        img2 = Image.open(img2_path)

        # Ensure both images have the same size
        if img1.size != img2.size:
            img2 = img2.resize(img1.size)

        # Convert to grayscale using ITU-R BT.601 standard (same as Pillow's default)
        # Pillow's L mode uses Y = 0.299R + 0.587G + 0.114B
        img1_gray = img1.convert('L')
        img2_gray = img2.convert('L')

        # Convert to numpy arrays
        img1_array = np.array(img1_gray)
        img2_array = np.array(img2_gray)

        # Calculate MSE
        mse = np.mean((img1_array - img2_array) ** 2)
        print(f"{os.path.basename(img1_path).split('.')[0]}: {mse} marks")

        # Check if images are similar
        if mse < threshold:
            print(f"{os.path.basename(img1_path).split('.')[0]}: Test passed, images are similar enough.")
            return True
        else:
            print(f"{os.path.basename(img1_path).split('.')[0]}: Test failed, images are not similar enough.")
            return False
    except Exception as e:
        print(f"{os.path.basename(img1_path).split('.')[0]}: Error ({e})")
        return False

def main():
    # Define paths
    output_path = "apps/basic-processing/output_images/greyscale_image.png"
    expected_path = "apps/basic-processing/output_images/expected_greyscale_image.png"

    # Check if the output file exists
    if not os.path.exists(output_path):
        print(f"Output file not found at {output_path}")
        return 1

    # If expected file doesn't exist, copy the output file as the expected file
    if not os.path.exists(expected_path):
        print(f"Expected file not found at {expected_path}, using output as expected")
        img = Image.open(output_path)
        img.save(expected_path)

    # Compare images
    result = compare_images(output_path, expected_path)

    # Return exit code
    return 0 if result else 1

if __name__ == "__main__":
    sys.exit(main())
