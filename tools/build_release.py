#!/usr/bin/env python3
"""Create an allowlisted source package. Candidate mode is not permission to publish."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DOCS = ['INSTALL.md','ASSISTANT-IMPORT.md','PHOTOS.md','LOCAL-RUNTIME.md',
        'ORACLE.md','RELEASE-NOTES.md','ONBOARDING.md','NAVIGATION.md','THEMES.md','TESTING.md','UPDATING.md','THIRD-PARTY.md','SECURITY-REVIEW.md','RELEASING.md']
ART = ['linty-logo-original.png','linty-side-peek-sock.png','linty-favicon-face-1024.png','README.md']
DEMO = ['01-black-tee.jpg','02-burgundy-top.jpg','03-black-trousers.jpg',
        '04-blue-jeans.jpg','05-beige-skirt.jpg','06-black-dress.jpg',
        '07-beige-cardigan.jpg','08-white-sneakers.jpg','09-black-boots.jpg',
        '10-silver-necklace.jpg','11-burgundy-blouse.jpg','12-black-skirt.jpg',
        'provenance.json','README.md']
TYPES = {'app':{'.html','.css','.js','.svg'},'runtime':{'.py','.js','.json','.txt'},
         'tests':{'.py','.js'},'tools':{'.py','.js'}}


def selected_files(root=ROOT):
    paths = [root / 'README.md', root / 'package.json', root / '.gitignore', root / 'package-lock.json', root / 'SECURITY.md', root / 'AI-USE-AND-SECURITY.md']
    paths += [p for p in (root / '.github').rglob('*.yml') if p.is_file()]
    paths += [root / 'docs' / n for n in DOCS]
    paths += [root / 'app/assets/linty' / n for n in ART]
    paths += [root / 'app/assets/demo' / n for n in DEMO]
    for folder, types in TYPES.items():
        paths += [p for p in (root / folder).rglob('*') if p.is_file() and p.suffix in types and '__pycache__' not in p.parts]
    for name in ['LICENSE','LICENSE.md','NOTICE']:
        if (root/name).is_file(): paths.append(root/name)
    for p in paths:
        if not p.is_file() or p.is_symlink():
            raise ValueError('Missing or symlinked public source: '+str(p.relative_to(root)))
    return sorted(set(paths))


def inspect(paths):
    problems=[]
    source=(ROOT/'app/closet-lint.html').read_text()
    for key in ('catalog','tags','bundles','pubdata'):
        m=re.search(r'<script\b[^>]*\bid="'+key+r'"[^>]*>(.*?)</script>',source,re.S)
        if not m or json.loads(m[1]) not in (None,{},[]):
            problems.append('Embedded '+key+' is missing or contains data')
    forbidden=re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{30,}')
    for p in paths:
        if p.name=='build_release.py':continue # contains the scanner's own signatures
        if p.suffix in ('.png', '.jpg'):continue # Explicit mascot/demo allowlists above; no arbitrary wardrobe photos.
        text=p.read_text(encoding='utf-8')
        if re.search(r'/home/[^/\s]+/',text):problems.append('Machine-specific path: '+str(p.relative_to(ROOT)))
        if forbidden.search(text):problems.append('Potential credential: '+str(p.relative_to(ROOT)))
    return problems


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--version',required=True)
    p.add_argument('--out',required=True,type=Path)
    p.add_argument('--candidate',action='store_true',help='Permit an unpublished audit package with unresolved release blockers')
    args=p.parse_args()
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?',args.version):p.error('Use a semantic version.')
    if not args.candidate and not any((ROOT/n).is_file() for n in ('LICENSE','LICENSE.md')):
        p.error('Choose a license before building a public release; use --candidate for an unpublished audit.')
    if args.out.exists():p.error('Output already exists; choose a new filename.')
    paths=selected_files();problems=inspect(paths)
    if problems:p.error('; '.join(problems))
    prefix='closet-lint-'+args.version
    files={str(f.relative_to(ROOT)):f.read_bytes() for f in paths}
    package=json.loads(files['package.json']);package['version']=args.version
    files['package.json']=(json.dumps(package,indent=2)+'\n').encode()
    lock=json.loads(files['package-lock.json']);lock['version']=args.version;lock['packages']['']['version']=args.version
    files['package-lock.json']=(json.dumps(lock,indent=2)+'\n').encode()
    if args.candidate:
        files['AUDIT-CANDIDATE.txt']=('UNPUBLISHED CANDIDATE '+args.version+'. Final platform checks and UI verification remain open. No personal wardrobe or curated collection is included.\n').encode()
    manifest={name:hashlib.sha256(data).hexdigest() for name,data in sorted(files.items())}
    files['SOURCE-MANIFEST.json']=(json.dumps(manifest,indent=2)+'\n').encode()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(args.out,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(prefix+'/'+name,date_time=(1980,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            archive.writestr(info,data)
    result={'file':str(args.out),'sha256':hashlib.sha256(args.out.read_bytes()).hexdigest(),
            'files':len(files),'version':args.version,'candidate':args.candidate,
            'embeddedData':'empty','sensitivePatternScan':'no matches; not proof of exhaustive secret detection',
            'excluded':'private data, database files, models, virtual environments, bytecode, planning/handoff docs, and outputs'}
    print(json.dumps(result,indent=2))


if __name__=='__main__':main()
