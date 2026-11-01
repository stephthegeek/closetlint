"""Local assistant handoff metadata and evidence, behind the runtime's existing authorization."""
import json
import os
from pathlib import Path
import platform
import re
import shlex
import sys
import time

from photo_environment import environment, probe
from storage import encode
from import_sources import folder as source_folder

ROOT = Path(__file__).resolve().parents[1]


def batch_id(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}', value):
        raise ValueError('Use a valid import batch ID from the request.')
    return value


def shell_command(args, windows=None):
    windows = os.name == 'nt' if windows is None else windows
    if windows:
        return '& ' + ' '.join("'" + str(arg).replace("'", "''") + "'" for arg in args)
    return shlex.join(map(str, args))


def verify_instance(store, db, expected):
    if expected is not None and store.meta(db, 'instance') != expected:
        raise ValueError('Wrong wardrobe. Return to the installation that prepared this request; nothing was imported.')


def readiness(folder):
    config = environment(folder)
    result = probe(config['python'] if config else sys.executable, background=False)
    ready = bool(result.get('packages', {}).get('Pillow', {}).get('ready'))
    python = [sys.executable] if (3, 11) <= sys.version_info[:2] < (3, 14) else (['py', '-3.12'] if os.name == 'nt' else ['python3.12'])
    return {'ready': ready, 'photoCheck': result,
            'photoSetupCommand': shell_command(python + [ROOT / 'tools/setup_photos.py', '--data', folder])}


def setup_info(store, batch):
    batch = batch_id(batch)
    with store.connect() as db:
        instance = store.meta(db, 'instance')
        row = db.execute("SELECT payload FROM documents WHERE collection='profile' AND id='wardrobeIdentity'").fetchone()
        name = (json.loads(row[0]).get('name') if row else '') or 'Closet Lint'
    manifest = source_folder(store, instance, batch) / 'import.json'
    base = [sys.executable, ROOT / 'tools/import_pieces.py', '--data', store.folder, '--expected-instance', instance]
    checked = readiness(store.folder)
    previous = saved_status(store, instance, batch)
    return {'setupVerified': previous['setupVerified'] and checked['ready'], 'saved': previous['saved'], 'report': previous['report'], 'request': previous['request'], 'instance': instance, 'name': name, 'computer': platform.node(), 'hosted': bool(os.environ.get('CLOSETLINT_ORIGIN')), 'appFolder': str(ROOT),
            'dataFolder': str(store.folder), 'batchId': batch, 'manifest': str(manifest), 'platform': platform.system(),
            'shell': 'PowerShell' if os.name == 'nt' else 'terminal',
            'openFolderCommand': ("Set-Location -LiteralPath '" + str(ROOT).replace("'", "''") + "'") if os.name == 'nt' else 'cd -- ' + shlex.quote(str(ROOT)),
            'checkCommand': shell_command(base + ['--check', '--batch-id', batch]),
            'statusCommand': shell_command(base + ['--status', '--batch-id', batch]),
            'schemaCommand': shell_command([sys.executable, ROOT / 'tools/import_pieces.py', '--schema']),
            'previewCommand': shell_command(base + ['--file', manifest]),
            'applyCommand': shell_command(base + ['--file', manifest, '--apply']),
            'partPreviewCommand': shell_command(base + ['--request-id', batch, '--part', '1']),
            'partApplyCommand': shell_command(base + ['--request-id', batch, '--part', '1', '--apply']),
            'finishCommand': shell_command(base + ['--request-id', batch, '--finish-request', 'complete']),
            'pauseCommand': shell_command(base + ['--request-id', batch, '--finish-request', 'needs-input']),
            **checked}


def check_setup(store, expected, batch):
    batch = batch_id(batch)
    if not expected:
        raise ValueError('Setup verification requires --expected-instance from the request.')
    with store.connect() as db:
        verify_instance(store, db, expected)
    result = readiness(store.folder)
    marker = {'wardrobeId': 'wardrobe:' + expected, 'appFolder': str(ROOT), 'dataFolder': str(store.folder),
              'ready': result['ready'], 'checkedAt': int(time.time() * 1000)}
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        verify_instance(store, db, expected)
        db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?)', ('profile', 'assistantSetup:' + batch, encode(marker)))
        db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?)', ('profile', 'assistantSetup', encode(marker)))
        store.bump(db)
    return {'ok': True, 'batchId': batch, 'mode': 'setup-check', 'committed': False,
            'setupVerified': marker['ready'], **result,
            'next': 'Return to Closet Lint and choose Check setup.' if marker['ready'] else 'Photo imports need setup. Run the photo setup command with permission, then repeat this check.'}


def saved_status(store, expected, batch):
    batch = batch_id(batch)
    if not expected:
        raise ValueError('Result verification requires the intended wardrobe identity.')
    with store.connect() as db:
        db.execute('BEGIN')
        verify_instance(store, db, expected)
        def record(key):
            row = db.execute("SELECT payload FROM documents WHERE collection='profile' AND id=?", (key,)).fetchone()
            return json.loads(row[0]) if row else {}
        marker = record('assistantSetup:' + batch) or record('assistantSetup')
        verified = (marker.get('ready') is True and marker.get('wardrobeId') == 'wardrobe:' + expected
                    and marker.get('appFolder') == str(ROOT) and marker.get('dataFolder') == str(store.folder))
        report = record('assistantImport:' + batch).get('report')
        # Only a committed receipt is evidence of a saved batch. A preview/check never is.
        saved = bool(report and report.get('mode') == 'applied' and report.get('committed') is True)
        parts = []
        for key, value in db.execute("SELECT id,payload FROM documents WHERE collection='profile' AND id LIKE 'assistantImport:%'"):
            part = json.loads(value).get('report', {})
            if part.get('requestId') == 'request:' + batch and part.get('mode') == 'applied' and part.get('committed') is True:
                parts.append({**part, 'batchId': key[len('assistantImport:'):]})
        parts.sort(key=lambda p: p['part'])
        progress = record('assistantRequest:' + batch)
        request = None
        if parts or progress:
            request = {'state': progress.get('state', 'in-progress'), 'note': progress.get('note', ''),
                       'cursor': progress.get('cursor', '') or (parts[-1].get('cursor', '') if parts else ''),
                       'parts': [{'part': p['part'], 'batchId': p['batchId'], **{k: p[k] for k in ('added', 'promoted', 'skipped', 'photosSaved')}} for p in parts],
                       'nextPart': max((p['part'] for p in parts), default=0) + 1}
            report = {'mode': 'request-results', 'committed': bool(parts),
                      **{k: sum(p[k] for p in parts) for k in ('added', 'promoted', 'skipped', 'photosSaved')},
                      'results': [{**row, 'part': p['part']} for p in parts for row in p['results']]}
            saved = bool(parts)
    return {'ok': True, 'instance': expected, 'batchId': batch, 'setupVerified': verified,
            'saved': saved, 'report': report if saved or request else None, 'request': request}


def request_part(value, part):
    value = batch_id(value)
    if len(value) > 60 or not isinstance(part, int) or isinstance(part, bool) or not 1 <= part <= 99999:
        raise ValueError('Use a request ID up to 60 characters and a part number from 1 to 99999.')
    return value + '__part_' + str(part)


def finish_request(store, expected, request, state, note='', cursor=''):
    request = batch_id(request)
    if not expected or state not in ('complete', 'needs-input', 'paused'):
        raise ValueError('Use the intended wardrobe and a valid request outcome.')
    if not isinstance(note, str) or len(note) > 2000 or not isinstance(cursor, str) or len(cursor) > 1000:
        raise ValueError('Keep the request note under 2000 characters and progress under 1000.')
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        verify_instance(store, db, expected)
        old = db.execute("SELECT payload FROM documents WHERE collection='profile' AND id=?", ('assistantRequest:' + request,)).fetchone()
        if old and json.loads(old[0]).get('state') == 'complete':
            if state != 'complete':
                raise ValueError('This request is complete. Start another import for new work.')
        else:
            db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?)', ('profile', 'assistantRequest:' + request,
                       encode({'state': state, 'note': note.strip(), 'cursor': cursor.strip()})))
            store.bump(db)
    return saved_status(store, expected, request)
