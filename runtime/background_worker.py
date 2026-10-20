"""Runs only in the optional image environment, never the dependency-free server."""
import os
from pathlib import Path
import sys


def main():
    from storage import require_safe_pillow
    require_safe_pillow()
    from PIL import Image, ImageOps
    from rembg import new_session, remove
    try:
        import onnxruntime
        onnxruntime.disable_telemetry_events()
    except ImportError:
        pass
    if sys.argv[1:] == ['--prepare']:
        new_session('u2net', providers=['CPUExecutionProvider'])
        return
    home = Path(os.environ['U2NET_HOME'])
    if not any((home / p).is_file() for p in ('models/u2net/u2net.onnx', 'u2net.onnx')):
        raise RuntimeError('Download the model during setup, not on a photo request.')
    Image.MAX_IMAGE_PIXELS = 40_000_000
    with Image.open(sys.argv[1], formats=['PNG', 'JPEG', 'WEBP', 'GIF']) as source:
        if source.width * source.height > 40_000_000:
            raise ValueError('Image too large')
        original = ImageOps.exif_transpose(source).convert('RGBA')
        original.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    session = new_session('u2net', providers=['CPUExecutionProvider'])
    mask = remove(original.convert('RGB'), session=session, only_mask=True).convert('L')
    if mask.size != original.size:
        raise ValueError('Mask dimensions changed')
    # Preserve preexisting transparency as well as source RGB; only alpha changes.
    from PIL import ImageChops
    original.putalpha(ImageChops.multiply(original.getchannel('A'), mask))
    original.save(sys.argv[2], format='PNG')


if __name__ == '__main__':
    main()
