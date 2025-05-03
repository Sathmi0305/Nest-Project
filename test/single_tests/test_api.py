import requests
import os
import sys
import time

def test_endpoint(endpoint, data):
    url = f"http://localhost:3000/{endpoint}"
    print(f"Testing {url}...")

    try:
        response = requests.post(url, json=data)
        if response.status_code in [200, 201]:
            print(f"✅ {endpoint} test passed - Status code: {response.status_code}")
            print(f"Response: {response.text}")
            return True
        else:
            print(f"❌ {endpoint} test failed - Status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ {endpoint} test failed - Exception: {e}")
        return False

def main():
    # Define test cases
    image_path = "apps/cse40/images/input_image.png"

    # Check if the test image exists
    if not os.path.exists(image_path):
        print(f"Test image not found at {image_path}. Please create it first.")
        return

    test_cases = [
        ("basic-processing/resize", {"imagePath": image_path, "width": 800, "height": 600}),
        ("basic-processing/greyscale", {"imagePath": image_path}),
        ("basic-processing/negative", {"imagePath": image_path}),
        ("basic-processing/contrast", {"imagePath": image_path, "contrast": 20}),
        ("basic-processing/rotate", {"imagePath": image_path, "angle": 90}),
        ("basic-processing/emboss", {"imagePath": image_path}),
        ("enhancement/histogram-equalization", {"imagePath": image_path}),
        ("feature-detection/canny-edge-detection", {"imagePath": image_path}),
        ("feature-detection/harris-corner-detection", {"imagePath": image_path}),
    ]

    # Run tests
    for endpoint, data in test_cases:
        test_endpoint(endpoint, data)
        time.sleep(1)  # Add a small delay between requests

if __name__ == "__main__":
    main()
