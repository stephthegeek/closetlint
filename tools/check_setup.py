#!/usr/bin/env python3
"""Check local setup and show next steps. Does not install anything or edit your wardrobe."""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from photo_environment import command, environment, probe, setup_command


def check(folder):
    folder = Path(folder).expanduser().absolute()
    result = {'python': '.'.join(map(str, sys.version_info[:3])), 'appReady': sys.version_info >= (3, 10),
              'wardrobeExists': (folder / 'wardrobe.sqlite3').is_file(), 'dataFolder': str(folder)}
    try:
        import sqlite3
        db = sqlite3.connect(':memory:')
        try:
            db.execute('SELECT 1')
        finally:
            db.close()
    except (ImportError, OSError) as error:
        result['appReady'] = False
        result['appProblem'] = 'This Python is missing SQLite support. Install a complete Python distribution.'
    for name in ('app/closet-lint.html', 'runtime/server.py'):
        if not (ROOT / name).is_file():
            result['appReady'] = False
            result['appProblem'] = 'App files are missing. Unzip the full Closet Lint download before running it.'
    config = environment(folder)
    result['photoEnvironment'] = config['config'] if config else None
    packages = probe(config['python'] if config else sys.executable)
    result['photoCheck'] = packages
    result['importsReady'] = bool(packages.get('packages', {}).get('Pillow', {}).get('ready'))
    result['backgroundReady'] = False
    if config and packages.get('packages') and all(p['ready'] for p in packages['packages'].values()):
        from background_removal import settings
        background = settings(folder)
        if background and background['python'] == config['python']:
            from background_worker import model_path, verify_model
            try:
                verify_model(model_path(Path(background['models'])))
                result['backgroundReady'] = True
            except (OSError, ValueError):
                result['modelProblem'] = 'The background-removal model is missing or damaged.'
    result['startCommand'] = command([sys.executable, str(ROOT / 'runtime/server.py'), '--data', str(folder)])
    result['photoSetupCommand'] = setup_command(folder)
    result['backgroundSetupCommand'] = setup_command(folder, background=True)
    return result


def report(result):
    print('Closet Lint setup check — nothing was installed or changed.\n')
    print(('Ready: ' if result['appReady'] else 'Needs attention: ') + 'Python ' + result['python'])
    if result.get('appProblem'):
        print(result['appProblem'])
    if not result['appReady']:
        print('The app needs Python 3.10 or newer, including SQLite support.')
    print('Wardrobe: ' + ('found at ' if result['wardrobeExists'] else 'not created yet at ') + result['dataFolder'])
    if result['appReady']:
        print('To ' + ('start the app' if result['wardrobeExists'] else 'start the app and create your wardrobe') + ':\n  ' + result['startCommand'])
    print('\nOptional photo imports: ' + ('ready' if result['importsReady'] else 'not set up or need an update'))
    print('Optional background removal: ' + ('ready' if result['backgroundReady'] else 'not set up or need an update'))
    if result['photoEnvironment'] == 'background-removal.json':
        print('Your existing background-removal environment can also be used for photo imports.')
    elif not result['photoEnvironment'] and result['importsReady']:
        print('Photo imports are available in this Python. The setup command below creates a separate environment if you prefer.')
    if not result['importsReady'] or not result['backgroundReady']:
        checked = result['photoCheck']
        if checked.get('error'):
            print(checked['error'])
        for name, value in checked.get('packages', {}).items():
            if not value['ready']:
                print('  ' + name + ': ' + value['message'])
        if result.get('modelProblem'):
            print(result['modelProblem'])
        print('\nThese tools are optional. Browsing, regular photo uploads, and backups work without them.')
        if not result['wardrobeExists']:
            print('Start the app once before setting up optional photo tools.')
        print('For photo imports only:\n  ' + result['photoSetupCommand'])
        print('For photo imports and background removal:\n  ' + result['backgroundSetupCommand'])
        print('New photo environments need Python 3.11–3.13; Python 3.12 is a suitable choice. Setup needs internet access.')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=Path('../closet-lint'), help='Your wardrobe data folder')
    parser.add_argument('--json', action='store_true', help='Print details for an assistant or support report')
    args = parser.parse_args(argv)
    result = check(args.data)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        report(result)
    return 0 if result['appReady'] else 2


if __name__ == '__main__':
    sys.exit(main())
