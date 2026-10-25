"""Optional local mask worker boundary. Core server has no image dependencies."""
import os
from pathlib import Path
import subprocess
import tempfile

from photo_environment import environments, setup_command

WORKER = Path(__file__).with_name('background_worker.py')


def settings(folder):
    for config in environments(folder):
        if not config.get('models'):
            continue
        models = Path(config['models'])
        if any((models / p).is_file() for p in ('models/u2net/u2net.onnx', 'u2net.onnx')):
            return {'python': config['python'], 'models': str(models)}
    return None


def remove_background(folder, image_bytes):
    config = settings(folder)
    if not config:
        raise ValueError('Local background removal is not set up. Run: ' + setup_command(folder, background=True))
    env = dict(os.environ, U2NET_HOME=config['models'], OMP_NUM_THREADS='2', NUMBA_NUM_THREADS='2')
    with tempfile.TemporaryDirectory(prefix='closetlint-mask-') as tmp:
        source, target = Path(tmp) / 'source', Path(tmp) / 'cutout.png'
        source.write_bytes(image_bytes)
        try:
            result = subprocess.run([config['python'], str(WORKER), str(source), str(target)],
                                    env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120, check=False)
        except (OSError, subprocess.TimeoutExpired):
            raise ValueError('Local background removal could not finish. Your original is unchanged.') from None
        if result.returncode or not target.is_file():
            raise ValueError('Background removal could not finish in this server session. Your original is unchanged. Restart the local server, then try again.')
        if target.stat().st_size > 32 * 1024 * 1024:
            raise ValueError('The cutout is too large. Your original is unchanged.')
        data = target.read_bytes()
        if not data.startswith(b'\x89PNG\r\n\x1a\n') or len(data) > 32 * 1024 * 1024:
            raise ValueError('The cutout could not be saved. Your original is unchanged.')
        return data
