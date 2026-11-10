"""Combine an exact release's app with the reviewed Docker packaging recipe."""
import argparse
import io
import json
from pathlib import Path
import re
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[2]


def prepare(ref, destination):
    if not re.fullmatch(r'v\d+\.\d+\.\d+', ref):
        raise ValueError('Choose a stable release tag such as v0.5.0.')
    destination = Path(destination).resolve()
    if destination.exists() or destination.is_relative_to(ROOT):
        raise ValueError('Choose a new build folder outside the checkout.')
    revision = subprocess.check_output(['git', 'rev-parse', '--verify', ref + '^{commit}'], cwd=ROOT, text=True).strip()
    archive = subprocess.check_output(['git', 'archive', '--format=tar', revision], cwd=ROOT)
    destination.mkdir(parents=True)
    with tarfile.open(fileobj=io.BytesIO(archive)) as source:
        for member in source:
            target = destination / member.name
            if member.issym() or member.islnk() or not target.resolve().is_relative_to(destination):
                raise ValueError('Unexpected source archive path.')
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                with source.extractfile(member) as data:
                    target.write_bytes(data.read())
            else:
                raise ValueError('Unexpected source archive entry.')
    version = json.loads((destination / 'package.json').read_text())['version']
    if ref != 'v' + version:
        raise ValueError('Release tag and application version disagree.')
    for name in ('Dockerfile', '.dockerignore', 'compose.yaml'):
        shutil.copy2(ROOT / name, destination / name)
    packaging = destination / 'deploy/docker'
    packaging.mkdir(parents=True, exist_ok=True)
    for path in (ROOT / 'deploy/docker').iterdir():
        if path.is_file() and path.suffix in ('.py', '.txt'):
            shutil.copy2(path, packaging / path.name)
    return {'version': version, 'revision': revision, 'context': str(destination)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ref', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.ref, args.out)))
