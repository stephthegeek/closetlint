#!/usr/bin/env python3
"""Explicit one-time, optional CPU setup; run using Python 3.11–3.13."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import os
import venv

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--data', required=True, type=Path)
a = p.parse_args()
if not (3, 11) <= sys.version_info[:2] < (3, 14):
    p.error('Use Python 3.11, 3.12, or 3.13 for this optional tool.')
folder = a.data.expanduser().resolve()
if not (folder / 'wardrobe.sqlite3').is_file():
    p.error('--data must point to an existing Closet Lint data folder.')
optional = folder / 'background-removal'
venv.create(optional / 'venv', with_pip=True)
python = optional / 'venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
subprocess.run([str(python), '-m', 'pip', 'install', '-r', str(Path(__file__).resolve().parents[1] / 'runtime/requirements-background.txt')], check=True)
models = optional / 'models'
env = dict(os.environ, U2NET_HOME=str(models), OMP_NUM_THREADS='2')
subprocess.run([str(python), str(Path(__file__).resolve().parents[1] / 'runtime/background_worker.py'), '--prepare'], env=env, check=True)
config = folder / 'background-removal.json'
config.write_text(json.dumps({'python': str(python), 'models': str(models)}, indent=2) + '\n')
print('Optional local background removal is ready. Refresh Closet Lint.')
