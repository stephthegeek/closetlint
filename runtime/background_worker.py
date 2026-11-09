"""Optional, local U²-Net and ISNet mask inference. The core server imports none of these packages."""
import hashlib
import os
from pathlib import Path
import sys
from urllib.request import urlopen

MODEL_URL = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx'
MODEL_SHA256 = '8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491'
MAX_MODEL_BYTES = 250 * 1024 * 1024
MODELS = {
    'u2net': (MODEL_URL, MODEL_SHA256, 320, (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    'isnet-general-use': (
        'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx',
        '60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a',
        1024, (0.5, 0.5, 0.5), (1, 1, 1)),
}


def model_spec(model):
    if model not in MODELS:
        raise ValueError('Unknown background removal model.')
    return MODELS[model]


def model_path(home, model='u2net'):
    model_spec(model)
    home = Path(home)
    for path in (home / 'models' / model / (model + '.onnx'), home / (model + '.onnx')):
        if path.is_file():
            return path
    return home / 'models' / model / (model + '.onnx')


def verify_model(path, model='u2net'):
    expected = model_spec(model)[1]
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    if digest.hexdigest() != expected:
        raise ValueError('The local background-removal model failed its checksum.')


def prepare(home, model='u2net'):
    url, expected = model_spec(model)[:2]
    path = model_path(home, model)
    if path.is_file():
        verify_model(path, model)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.download')
    try:
        digest = hashlib.sha256()
        total = 0
        with urlopen(url, timeout=60) as response, temporary.open('wb') as target:
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_MODEL_BYTES:
                    raise ValueError('The background-removal model download is too large.')
                target.write(chunk)
                digest.update(chunk)
        if digest.hexdigest() != expected:
            raise ValueError('The background-removal model download failed its checksum.')
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def infer_mask(image, session, model='u2net'):
    import numpy as np
    from PIL import Image

    _, _, size, mean, std = model_spec(model)
    resized = image.convert('RGB').resize((size, size), Image.Resampling.LANCZOS)
    pixels = np.asarray(resized, dtype=np.float64)
    pixels /= max(float(pixels.max()), 1e-6)
    pixels = (pixels - np.array(mean)) / np.array(std)
    inputs = {session.get_inputs()[0].name: np.expand_dims(pixels.transpose(2, 0, 1), 0).astype(np.float32)}
    prediction = np.asarray(session.run(None, inputs)[0])[0, 0]
    minimum, maximum = float(prediction.min()), float(prediction.max())
    if maximum > minimum:
        prediction = (prediction - minimum) / (maximum - minimum)
    else:
        prediction = np.zeros_like(prediction)
    mask = Image.fromarray((prediction.clip(0, 1) * 255).astype('uint8'), mode='L')
    return mask.resize(image.size, Image.Resampling.LANCZOS)


def main():
    from storage import require_safe_pillow
    require_safe_pillow()
    from PIL import Image, ImageChops, ImageOps
    import onnxruntime as ort

    ort.disable_telemetry_events()
    home = Path(os.environ['U2NET_HOME'])
    if sys.argv[1:] == ['--prepare']:
        for model in MODELS:
            prepare(home, model)
        return
    model = sys.argv[3] if len(sys.argv) > 3 else 'u2net'
    path = model_path(home, model)
    if not path.is_file():
        raise RuntimeError('Download the model during setup, not on a photo request.')
    verify_model(path, model)
    Image.MAX_IMAGE_PIXELS = 40_000_000
    with Image.open(sys.argv[1], formats=['PNG', 'JPEG', 'WEBP', 'GIF']) as source:
        if source.width * source.height > 40_000_000:
            raise ValueError('Image too large')
        original = ImageOps.exif_transpose(source).convert('RGBA')
        original.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(path), sess_options=options, providers=['CPUExecutionProvider'])
    mask = infer_mask(original, session, model)
    # Retain original RGB and any preexisting transparency; change only alpha.
    original.putalpha(ImageChops.multiply(original.getchannel('A'), mask))
    original.save(sys.argv[2], format='PNG')


if __name__ == '__main__':
    main()
