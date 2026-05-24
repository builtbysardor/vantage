from PIL import Image, ImageSequence
import sys

def convert_webp_to_gif(input_path, output_path, fps=2):
    print(f"Converting {input_path} to {output_path} at {fps} FPS...")
    with Image.open(input_path) as img:
        frames = []
        for frame in ImageSequence.Iterator(img):
            # Convert to RGB to ensure compatibility and reduce size if possible
            frames.append(frame.convert("RGB"))
        
        if not frames:
            print("No frames found!")
            return

        # Calculate duration in milliseconds
        duration = int(1000 / fps)
        
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=duration,
            loop=0,
            optimize=True
        )
    print("Done!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 convert.py <input.webp> <output.gif> [fps]")
        sys.argv = ["convert.py", "test.webp", "test.gif"]
    
    fps = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    convert_webp_to_gif(sys.argv[1], sys.argv[2], fps)
