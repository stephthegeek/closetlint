"""Shared optional photo tools. Reading setup never creates or changes a wardrobe."""
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys

RUNTIME = Path(__file__).resolve().parent


def environments(folder):
    """Prefer shared setup, while retaining existing background-removal setups."""
    for name in ('photo-tools.json', 'background-removal.json'):
        try:
            value = json.loads((Path(folder) / name).read_text(encoding='utf-8'))
            python = Path(value['python']).expanduser()
            if not python.is_absolute() or not python.is_file():
                continue
            models = value.get('models')
            if models is not None and (not isinstance(models, str) or not Path(models).is_absolute()):
                continue
            yield {'python': str(python), 'models': models, 'config': name}
        except (OSError, ValueError, TypeError, KeyError):
            continue


def environment(folder):
    return next(environments(folder), None)


def command(arguments):
    return subprocess.list2cmdline([str(x) for x in arguments]) if os.name == 'nt' else shlex.join(str(x) for x in arguments)


def setup_command(folder, background=False):
    python = [sys.executable] if (3, 11) <= sys.version_info[:2] < (3, 14) else (['py', '-3.12'] if os.name == 'nt' else ['python3.12'])
    args = python + [str(RUNTIME.parent / 'tools/setup_photos.py'), '--data', str(Path(folder).expanduser().absolute())]
    if background:
        args.append('--background')
    return command(args)


def probe(python, background=True):
    """Check actual imports in a subprocess; keep native libraries out of the server."""
    script = '''import importlib, importlib.metadata, json, re, sys
requirements = json.loads(sys.argv[1])
result = {"python": list(sys.version_info[:3]), "packages": {}}
for package, module, minimum, maximum in requirements:
    try:
        version = importlib.metadata.version(package)
        numbers = re.match(r"(\\d+)\\.(\\d+)\\.(\\d+)", version)
        if not numbers or not tuple(minimum) <= tuple(map(int, numbers.groups())) < tuple(maximum):
            raise ValueError("installed version " + version + " is outside the supported range")
        imported = importlib.import_module(module)
        if module == "onnxruntime":
            imported.disable_telemetry_events()
        result["packages"][package] = {"ready": True, "version": version}
    except importlib.metadata.PackageNotFoundError:
        result["packages"][package] = {"ready": False, "message": "not installed"}
    except Exception as error:
        result["packages"][package] = {"ready": False, "message": str(error)}
print(json.dumps(result))
'''
    requirements = [('Pillow', 'PIL.Image', [13, 0, 0], [14, 0, 0])]
    if background:
        requirements += [('numpy', 'numpy', [2, 3, 0], [3, 0, 0]), ('onnxruntime', 'onnxruntime', [1, 31, 0], [2, 0, 0])]
    try:
        result = subprocess.run([str(python), '-c', script, json.dumps(requirements)], capture_output=True,
                                text=True, timeout=30, env=dict(os.environ, OMP_NUM_THREADS='2'))
        if result.returncode:
            return {'error': 'The configured photo Python could not start. Rerun photo setup.'}
        value = json.loads(result.stdout)
        if not isinstance(value, dict) or not isinstance(value.get('packages'), dict):
            raise ValueError('Invalid setup response')
        return value
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return {'error': 'The photo environment could not be checked. Rerun photo setup.'}


def import_in_environment(folder, arguments):
    """Return the delegated CLI exit code, or None when this Python should handle it."""
    config = environment(folder)
    if not config or os.path.normcase(os.path.abspath(config['python'])) == os.path.normcase(os.path.abspath(sys.executable)):
        return None
    try:
        return subprocess.run([config['python'], str(RUNTIME.parent / 'tools/import_pieces.py'), *arguments], check=False).returncode
    except OSError:
        raise ValueError('The photo environment could not start. Run: ' + setup_command(folder)) from None
