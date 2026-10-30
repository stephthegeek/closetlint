"""Build a data-free Node/Python hosting ZIP from the current source."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        parser.error('Choose a new output filename; existing packages are not overwritten.')
    spec = importlib.util.spec_from_file_location('release_builder', ROOT / 'tools/build_release.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    files = builder.selected_files()
    problems = builder.inspect(files)
    if problems:
        parser.error('; '.join(problems))
    files += [p for p in (ROOT / 'deploy/siteground').rglob('*')
              if p.is_file() and p.suffix in ('.py', '.cjs', '.md') and '__pycache__' not in p.parts]
    contents = {str(p.relative_to(ROOT)): p.read_bytes() for p in files}
    contents.pop('package-lock.json', None)
    contents['package.json'] = (json.dumps({
        'name': 'closetlint-personal-host', 'version': '0.0.2', 'private': True,
        'main': 'server.cjs', 'engines': {'node': '>=22'},
        'scripts': {'build': 'node --check deploy/siteground/gateway.cjs', 'start': 'node server.cjs'},
    }, indent=2) + '\n').encode()
    contents['server.cjs'] = b"require('./deploy/siteground/gateway.cjs').main();\n"
    contents['HOSTED-SOURCE-MANIFEST.json'] = json.dumps({
        name: hashlib.sha256(data).hexdigest() for name, data in sorted(contents.items())
    }, indent=2).encode()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.out, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(contents.items()):
            archive.writestr(name, data)
    print(json.dumps({'file': str(args.out), 'files': len(contents),
                      'bytes': args.out.stat().st_size,
                      'sha256': hashlib.sha256(args.out.read_bytes()).hexdigest()}, indent=2))


if __name__ == '__main__':
    main()
