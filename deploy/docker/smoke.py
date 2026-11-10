"""Exercise real HTTP and data persistence using disposable wardrobes only."""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[2]
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=')
NULL_VERSION = hashlib.sha256(b'null').hexdigest()


def run(*args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=180, **kwargs).stdout.strip()


def exercise(image=None, models=False):
    ident = 'closetlint-test-' + uuid.uuid4().hex[:12]
    volume = ident + '-data'
    process = None
    token = ''
    with tempfile.TemporaryDirectory(prefix=ident) as temporary:
        data = Path(temporary) / 'data'
        log = (Path(temporary) / 'server.log').open('w+')
        if image:
            port = 6684
            run('docker', 'volume', 'create', volume)
        else:
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
        origin = 'http://127.0.0.1:' + str(port)
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

        def request(path, value=None, method=None, headers=None, expected=200):
            body = json.dumps(value).encode() if isinstance(value, dict) else value
            h = {'X-ClosetLint-Token': token}
            h.update(headers or {})
            req = urllib.request.Request(origin + path, data=body, method=method, headers=h)
            try:
                with opener.open(req, timeout=20) as response:
                    status, result = response.status, response.read()
            except urllib.error.HTTPError as error:
                status, result = error.code, error.read()
            assert status == expected, (path, status, result[:240])
            return result

        def start():
            nonlocal process, token
            if image:
                run('docker', 'run', '-d', '--name', ident, '--read-only', '--tmpfs', '/tmp:rw,size=268435456',
                    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                    '-e', 'CLOSETLINT_PREPARE_MODELS=' + ('1' if models else '0'),
                    '-p', '127.0.0.1:6684:6684', '--mount', 'source=' + volume + ',target=/data', image)
            else:
                process = subprocess.Popen([sys.executable, str(ROOT / 'deploy/docker/start.py'),
                                            '--data', str(data), '--port', str(port)], stdout=log, stderr=log)
            for _ in range(180):
                try:
                    if json.loads(request('/healthz')) == {'ok': True}:
                        break
                except (OSError, AssertionError):
                    time.sleep(.25)
            else:
                if image:
                    print(run('docker', 'logs', ident))
                else:
                    log.seek(0)
                    print(log.read())
                raise AssertionError('Application did not become ready')
            html = request('/').decode()
            config = json.loads(re.search(r'window\.ClosetLintLocal=(.*?);</script>', html).group(1))
            token = config['token']
            assert not config['hosted']
            return json.loads(request('/api/state'))

        def stop():
            if image:
                run('docker', 'stop', '--time', '15', ident)
                assert run('docker', 'inspect', '--format', '{{.State.ExitCode}}', ident) == '0'
                run('docker', 'rm', ident)
            elif process:
                process.terminate()
                process.wait(timeout=15)
                assert process.returncode == 0

        def command(script):
            if image:
                return run('docker', 'exec', ident, 'python', '-c', script)
            return run(sys.executable, '-c', script, cwd=ROOT)

        try:
            first = start()
            assert not first['collections']['custom'], 'Fixture must begin empty'
            request('/api/state', headers={'X-ClosetLint-Token': ''}, expected=403)
            request('/api/state', headers={'Origin': 'https://unrelated.invalid'}, expected=403)
            request('/healthz', headers={'Host': 'unrelated.invalid'}, expected=403)
            request('/api/backup', headers={'Sec-Fetch-Site': 'cross-site'}, expected=403)
            sheets = json.loads((ROOT / 'app/assets/quiz-photos/manifest.json').read_text())
            sheet = next(iter(sheets.values()))['file']
            assert request('/assets/quiz-photos/' + sheet) == (ROOT / 'app/assets/quiz-photos' / sheet).read_bytes()
            photo = json.loads(request('/api/assets', PNG, 'POST'))['id']
            record = {'name': 'Docker persistence fixture', 'meta': 'Tops', 'sub': 'T-shirts',
                      'photoId': photo, 'fav': True, 'wears': ['2026-01-02']}
            request('/api/doc/custom/docker-piece', record, 'PUT', {'If-Match': '"' + NULL_VERSION + '"'})
            state = json.loads(request('/api/state'))
            board = {'name': 'Persistent composition', 'pieces': [{'id': 'c-docker-piece', 'x': 10, 'y': 20, 'w': 30}]}
            request('/api/board', board, 'PUT', {'If-Match': '"' + state['writeVersions']['board'] + '"'})
            # Writes without a current version remain rejected.
            request('/api/doc/custom/docker-piece', {'name': 'stale'}, 'PUT', {'If-Match': '"' + NULL_VERSION + '"'}, expected=409)
            assert request('/_blob/' + photo) == PNG
            before = json.loads(request('/api/state'))
            backup = request('/api/backup')
            with zipfile.ZipFile(io.BytesIO(backup)) as archive:
                payload = json.loads(archive.read('backup.json'))
                assert payload['collections']['custom']['docker-piece'] == before['collections']['custom']['docker-piece']
                assert all(payload['collections']['custom']['docker-piece'][key] == value for key, value in record.items())
                assert archive.read('photos/' + photo + '.png') == PNG
            folder = '/data' if image else str(data)
            setup = json.loads(command("import sys,json;sys.path.insert(0,'tools');import check_setup;print(json.dumps(check_setup.check(" + repr(folder) + ")))"))
            assert setup['appReady'] and setup['importsReady']
            assert all(p['ready'] for p in setup['photoCheck']['packages'].values())
            if not models:
                assert not setup['backgroundReady'], 'Explicit opt-out must avoid downloads'
                assert not json.loads(request('/api/photos/background-status'))['available']
            # A prepared request is visible to an explicitly authorized container command.
            prepared = json.loads(request('/api/details/prepare', {'instance': before['instance'],
                'request': 'details-docker-test', 'mode': 'titles', 'pieces': [{'id': 'c-docker-piece', 'fields': []}]}, 'POST'))
            assert prepared
            assert command("from pathlib import Path;p=Path(" + repr(folder) + ");assert list(p.rglob('request.json'));print('request-visible')") == 'request-visible'
            if image:
                assert run('docker', 'exec', ident, 'id', '-u') == '10001'
                assert run('docker', 'inspect', '--format', '{{.HostConfig.ReadonlyRootfs}}', ident) == 'true'
                run('docker', 'exec', ident, 'python', 'deploy/docker/health.py')
            if models:
                assert image, 'Actual model preparation runs inside the image'
                for _ in range(180):
                    ready = json.loads(command("import sys,json;sys.path.insert(0,'tools');import check_setup;print(json.dumps(check_setup.check('/data')))"))
                    if ready['backgroundReady'] and ready['jewelryBackgroundReady']:
                        break
                    time.sleep(2)
                else:
                    print(run('docker', 'logs', ident))
                    raise AssertionError('Automatic model preparation did not finish')
                model_stamp_script = "from pathlib import Path;import json;print(json.dumps({str(p):p.stat().st_mtime_ns for p in Path('/data/photo-tools/models').rglob('*.onnx')},sort_keys=True))"
                model_stamps = command(model_stamp_script)
                assert len(json.loads(model_stamps)) == 2, model_stamps
                for model in ('u2net', 'isnet-general-use'):
                    run('docker', 'exec', ident, 'python', 'runtime/background_worker.py',
                        'app/assets/demo/01-black-tee.jpg', '/tmp/' + model + '.png', model)
                    result = command("from pathlib import Path;from PIL import Image;p=Path('/tmp/" + model + ".png');assert p.read_bytes().startswith(bytes.fromhex('89504e470d0a1a0a'));i=Image.open(p);assert i.mode=='RGBA';print('inference-ok')")
                    assert result == 'inference-ok'
            stop()
            after = start()
            assert after['instance'] == before['instance']
            assert after['collections'] == before['collections'] and after['board'] == board
            assert request('/_blob/' + photo) == PNG
            if models:
                assert json.loads(request('/api/photos/background-status'))['available']
                for _ in range(60):
                    logs = run('docker', 'logs', ident)
                    if 'Background removal ready.' in logs:
                        break
                    time.sleep(.5)
                else:
                    raise AssertionError('Saved model verification did not finish')
                assert 'Downloading background removal model:' not in logs, logs
                assert command(model_stamp_script) == model_stamps, 'Restart must reuse saved model files'
            # Exercise the ordinary restore confirmation into this disposable wardrobe.
            preview = json.loads(request('/api/restore/preview', backup, 'POST'))
            request('/api/restore/apply', {'ticket': preview['ticket'], 'confirm': 'replace-wardrobe'}, 'POST')
            restored = json.loads(request('/api/state'))
            assert restored['instance'] == before['instance']
            assert restored['collections'] == before['collections'] and restored['board'] == board
            assert request('/_blob/' + photo) == PNG
            stop()
            print(json.dumps({'passed': True, 'mode': 'docker' if image else 'local-wrapper', 'modelsTested': models,
                              'checks': ['startup', 'request-protection', 'quiz-assets', 'photo-upload', 'versioned-save',
                                         'photo-tools', 'assistant-request-access', 'backup', 'container-replacement', 'restore', 'shutdown']}))
        finally:
            if image:
                subprocess.run(['docker', 'rm', '-f', ident], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.run(['docker', 'volume', 'rm', volume], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            elif process and process.poll() is None:
                process.terminate()
                process.wait(timeout=15)
            log.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', help='Build image first; omit to check the startup wrapper locally')
    parser.add_argument('--models', action='store_true', help='Verify automatic first-run preparation, inference and model cache reuse inside Docker')
    args = parser.parse_args()
    exercise(args.image, args.models)
