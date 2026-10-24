#!/usr/bin/env python3
"""Set up shared local photo imports, with optional background removal."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import venv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from photo_environment import environment, probe, setup_command


def write_config(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    os.chmod(temporary, 0o600)
    temporary.replace(path)


def setup(folder, background=False):
    folder = Path(folder).expanduser().resolve()
    if folder.is_relative_to(ROOT) or not (folder / 'wardrobe.sqlite3').is_file():
        raise ValueError('Choose an existing wardrobe data folder outside the app folder. Start Closet Lint once to create it; this command will not create another wardrobe.')
    previous = environment(folder)
    checked = probe(previous['python'], background=False) if previous else {}
    version = tuple(checked.get('python', []))[:2]
    if previous and (3, 11) <= version < (3, 14):
        python = Path(previous['python'])
        print('Reusing your existing photo environment. Your photos and model stay in place.', flush=True)
    else:
        if not (3, 11) <= sys.version_info[:2] < (3, 14):
            raise ValueError('The app can use this Python, but shared photo tools need Python 3.11, 3.12, or 3.13. Install Python 3.12, then run: ' + setup_command(folder, background))
        location = folder / 'photo-tools' / ('venv-py' + str(sys.version_info[0]) + str(sys.version_info[1]))
        try:
            venv.create(location, with_pip=True)
        except (OSError, subprocess.CalledProcessError) as error:
            help_text = 'Install the matching Python venv/ensurepip package from your Linux distribution, then retry.' if sys.platform.startswith('linux') else 'Repair or reinstall a complete Python installation, including pip, then retry.'
            raise ValueError('Could not create the isolated photo environment. ' + help_text) from error
        python = location / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    requirements = ROOT / 'runtime' / ('requirements-background.txt' if background else 'requirements-import.txt')
    print('Installing optional photo tools in their own environment…', flush=True)
    subprocess.run([str(python), '-m', 'pip', 'install', '--disable-pip-version-check', '-r', str(requirements)], check=True)
    checked = probe(python, background=background)
    if checked.get('error') or not all(value['ready'] for value in checked.get('packages', {}).values()) or not checked.get('packages'):
        raise ValueError('The photo packages could not be loaded. Run tools/check_setup.py with the same --data folder for details.')
    models = Path(previous['models']) if previous and previous.get('models') else folder / 'photo-tools/models'
    config = {'python': str(python), 'models': str(models)}
    # Photo imports can work even if the subsequent optional model download fails.
    write_config(folder / 'photo-tools.json', config)
    if background:
        from background_worker import model_path, verify_model
        if model_path(models).is_file():
            try:
                verify_model(model_path(models))
            except (OSError, ValueError):
                models = folder / 'photo-tools/models'
        env = dict(os.environ, U2NET_HOME=str(models), OMP_NUM_THREADS='2')
        print('Checking or downloading the background-removal model…', flush=True)
        try:
            subprocess.run([str(python), str(ROOT / 'runtime/background_worker.py'), '--prepare'], env=env, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as error:
            detail = (error.stderr or '').strip().splitlines()
            message = detail[-1][:240] if detail else 'Check your internet connection, and retry the same command.'
            raise ValueError('Photo imports are ready, but background removal setup did not finish. ' + message) from error
        config['models'] = str(models)
        write_config(folder / 'photo-tools.json', config)
        write_config(folder / 'background-removal.json', config)
    print('Photo imports are ready. The import command will use this environment automatically.')
    if background:
        print('Background removal is ready, too. Refresh Closet Lint.')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, required=True, help='Your existing wardrobe data folder')
    parser.add_argument('--background', action='store_true', help='Also install background removal and its model')
    args = parser.parse_args(argv)
    try:
        setup(args.data, args.background)
        return 0
    except subprocess.CalledProcessError:
        print('Photo setup did not finish. Check your internet connection and the package message above, then run the same command again. Your wardrobe is unchanged.', file=sys.stderr)
    except (OSError, ValueError) as error:
        print('Photo setup did not finish: ' + str(error), file=sys.stderr)
    return 2


if __name__ == '__main__':
    sys.exit(main())
