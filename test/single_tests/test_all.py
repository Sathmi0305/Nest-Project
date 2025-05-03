import os
import sys
import subprocess

def run_test(test_name, image_path, output_path, expected_path):
    print(f"Testing {test_name}...")
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Run the image processing function
    if test_name == "resize":
        subprocess.run(["node", "dist/apps/basic-processing/main.js", "resize", image_path, "800", "600"])
    elif test_name == "greyscale":
        subprocess.run(["node", "dist/apps/basic-processing/main.js", "greyscale", image_path])
    elif test_name == "negative":
        subprocess.run(["node", "dist/apps/basic-processing/main.js", "negative", image_path])
    elif test_name == "contrast":
        subprocess.run(["node", "dist/apps/basic-processing/main.js", "contrast", image_path, "20"])
    elif test_name == "rotate":
        subprocess.run(["node", "dist/apps/basic-processing/main.js", "rotate", image_path, "90"])
    elif test_name == "emboss":
        subprocess.run(["node", "dist/apps/basic-processing/main.js", "emboss", image_path])
    elif test_name == "histogram":
        subprocess.run(["node", "dist/apps/enhancement/main.js", "histogram", image_path])
    elif test_name == "canny":
        subprocess.run(["node", "dist/apps/feature-detection/main.js", "canny", image_path])
    elif test_name == "harris":
        subprocess.run(["node", "dist/apps/feature-detection/main.js", "harris", image_path])
    
    # Check if the output file exists
    if os.path.exists(output_path):
        print(f"✅ {test_name} test passed - output file created")
    else:
        print(f"❌ {test_name} test failed - output file not created")

def main():
    # Define test cases
    test_cases = [
        ("resize", "apps/cse40/images/input_image.png", "apps/basic-processing/output_images/resized_image.png", None),
        ("greyscale", "apps/cse40/images/input_image.png", "apps/basic-processing/output_images/greyscale_image.png", None),
        ("negative", "apps/cse40/images/input_image.png", "apps/basic-processing/output_images/negative_image.png", None),
        ("contrast", "apps/cse40/images/input_image.png", "apps/basic-processing/output_images/contrast_20_image.png", None),
        ("rotate", "apps/cse40/images/input_image.png", "apps/basic-processing/output_images/rotated_90_image.png", None),
        ("emboss", "apps/cse40/images/input_image.png", "apps/basic-processing/output_images/emboss_image.png", None),
        ("histogram", "apps/cse40/images/input_image.png", "apps/enhancement/output_images/histogram_equalized.png", None),
        ("canny", "apps/cse40/images/input_image.png", "apps/feature-detection/output_images/canny_edges.png", None),
        ("harris", "apps/cse40/images/input_image.png", "apps/feature-detection/output_images/harris_sharp_input_image.png", None),
    ]
    
    # Run tests
    for test_name, image_path, output_path, expected_path in test_cases:
        run_test(test_name, image_path, output_path, expected_path)

if __name__ == "__main__":
    main()
