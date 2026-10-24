"""Encode one small preview, without changing the source photo or its alpha mask."""
import os
import sys


def main():
    from storage import require_safe_pillow
    try:
        require_safe_pillow()
        from PIL import Image, ImageOps, features
        if not features.check('webp'):
            return 3
    except (ImportError, ValueError):
        return 3
    if hasattr(os, 'nice'):
        os.nice(10)
    Image.MAX_IMAGE_PIXELS = 40_000_000
    with Image.open(sys.argv[1], formats=['PNG', 'JPEG', 'WEBP', 'GIF']) as source:
        if source.width * source.height > 40_000_000:
            raise ValueError('Photo is too large')
        image = ImageOps.exif_transpose(source).convert('RGBA')
        image.thumbnail((640, 640), Image.Resampling.LANCZOS)
        image.info.clear()
        image.save(sys.argv[2], format='WEBP', quality=82, method=4, alpha_quality=100)
    return 0


if __name__ == '__main__':
    sys.exit(main())
