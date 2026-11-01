"""Synthetic hosted gateway checks; never reads the personal wardrobe."""
import contextlib
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import base64
import concurrent.futures
import signal
import threading

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from storage import Archive, Store, write_version


@unittest.skipUnless(shutil.which('node'), 'Node is required for the hosted gateway')
class HostedTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.data = Path(self.tmp.name) / 'data'
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            self.port = sock.getsockname()[1]
        self.start()

    def start(self):
        env = {**os.environ, 'PORT': str(self.port), 'CLOSETLINT_DATA': str(self.data),
               'CLOSETLINT_ORIGIN': 'https://closet.example.test', 'CLOSETLINT_PYTHON': sys.executable,
               **getattr(self, 'extra_env', {})}
        self.process = subprocess.Popen(['node', str(ROOT / 'deploy/siteground/gateway.cjs')],
                                        env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for _ in range(150):
            if self.process.poll() is not None:
                self.fail('Gateway exited: ' + self.process.stderr.read().decode())
            try:
                status, _, _ = self.call('GET', '/')
                if status == 200:
                    return
            except OSError:
                pass
            time.sleep(.02)
        self.fail('Gateway did not become ready')

    def stop(self):
        self.process.terminate()
        try:
            self.process_output = self.process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.communicate()

    def tearDown(self):
        self.stop()
        self.tmp.cleanup()

    def call(self, method, path, body=None, headers=None):
        with contextlib.closing(http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)) as conn:
            conn.request(method, path, body=body, headers={'Host': 'closet.example.test', **(headers or {})})
            response = conn.getresponse()
            return response.status, response.read(), {k.lower(): v for k, v in response.getheaders()}

    def test_origin_token_save_retry_backup_and_restart(self):
        status, page, headers = self.call('GET', '/')
        self.assertEqual(status, 200)
        self.assertEqual(headers['cache-control'], 'private, no-store')
        config = json.loads(re.search(rb'window.ClosetLintLocal=(.*?);</script>', page)[1])
        auth = {'X-ClosetLint-Token': config['token'], 'Origin': 'https://closet.example.test', 'If-Match': '"' + write_version(None) + '"'}
        for extra in ({'Origin': 'https://other.test'}, {'Host': 'other.test'},
                      {'Sec-Fetch-Site': 'cross-site'}, {'X-ClosetLint-Token': 'wrong'}):
            self.assertEqual(self.call('PUT', '/api/doc/custom/synthetic', b'{}', {**auth, **extra})[0], 403)
        record = json.dumps({'name': 'Synthetic hosted tee', 'meta': 'Tops', 'colors': ['black']}).encode()
        for _ in range(2):
            self.assertEqual(self.call('PUT', '/api/doc/custom/synthetic', record, auth)[0], 200)
        board = json.dumps({'pieces': [{'id': 'c-synthetic', 'x': 12, 'y': 15}]}).encode()
        self.assertEqual(self.call('PUT', '/api/board', board, auth)[0], 200)
        state = json.loads(self.call('GET', '/api/state', headers=auth)[1])
        self.assertEqual(len(state['collections']['custom']), 1)
        status, backup, _ = self.call('GET', '/api/backup', headers=auth)
        self.assertEqual(status, 200)
        saved = Path(self.tmp.name) / 'backup.zip'
        saved.write_bytes(backup)
        restored = Store(Path(self.tmp.name) / 'restored')
        with contextlib.closing(Archive(saved)) as archive:
            restored.restore(archive)
        self.assertEqual(restored.state()['collections'], state['collections'])
        self.assertEqual(restored.state()['board'], state['board'])
        self.stop()
        self.start()
        new_page = self.call('GET', '/')[1]
        new_config = json.loads(re.search(rb'window.ClosetLintLocal=(.*?);</script>', new_page)[1])
        self.assertNotEqual(config['token'], new_config['token'])
        self.assertEqual(self.call('GET', '/api/state', headers=auth)[0], 403)
        state_after = json.loads(self.call('GET', '/api/state', headers={'X-ClosetLint-Token': new_config['token']})[1])
        self.assertEqual(state_after, state)

    def test_binary_streams_concurrency_and_rejected_body_drain(self):
        page = self.call('GET', '/')[1]
        config = json.loads(re.search(rb'window.ClosetLintLocal=(.*?);</script>', page)[1])
        auth = {'X-ClosetLint-Token': config['token'], 'Origin': 'https://closet.example.test', 'If-Match': '"' + write_version(None) + '"'}
        photo = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=') + b'synthetic' * 250000
        status, result, _ = self.call('POST', '/api/assets', photo, auth)
        self.assertEqual(status, 200)
        photo_id = json.loads(result)['id']
        # A rejection before reading the body must not corrupt the next frame.
        self.assertEqual(self.call('PUT', '/api/missing', b'x' * 200000, auth)[0], 404)
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            responses = list(pool.map(lambda _: self.call('GET', '/_blob/' + photo_id, headers=auth), range(16)))
        self.assertTrue(all(status == 200 and data == photo for status, data, _ in responses))
        self.assertEqual(self.call('GET', '/api/state', headers=auth)[0], 200)
        self.assertEqual(self.call('HEAD', '/')[0], 501)
        self.assertEqual(self.call('GET', '/api/state', headers=auth)[0], 200)
        self.stop()
        self.assertNotIn(b'MaxListenersExceededWarning', self.process_output[1],
                         'streaming backpressure must not accumulate connection listeners')
        self.start()

    def test_calendar_photo_burst_waits_without_dropping_images(self):
        config = json.loads(re.search(rb'window.ClosetLintLocal=(.*?);</script>', self.call('GET', '/')[1])[1])
        auth = {'X-ClosetLint-Token': config['token'], 'Origin': 'https://closet.example.test',
                'If-Match': '"' + write_version(None) + '"'}
        photo = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=')
        asset_id = Store(self.data).upload(photo)
        # Hold one ordinary save briefly while a calendar's visible photos arrive.
        blocker = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        blocker.putrequest('PUT', '/api/doc/edits/synthetic', skip_host=True)
        for key, value in {'Host': 'closet.example.test', **auth, 'Content-Length': '2'}.items():
            blocker.putheader(key, value)
        blocker.endheaders(b'{')
        barrier = threading.Barrier(65)
        def fetch(i):
            barrier.wait(timeout=5)
            return self.call('GET', '/_thumb/' + asset_id + '?cell=' + str(i), headers=auth)
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=64) as pool:
                jobs = [pool.submit(fetch, i) for i in range(64)]
                barrier.wait(timeout=5)
                time.sleep(.3)
                blocker.send(b'}')
                response = blocker.getresponse(); self.assertEqual(response.status, 200); response.read()
                results = [job.result() for job in jobs]
            self.assertEqual([status for status, _, _ in results], [200] * 64)
            self.assertTrue(all(data == photo for _, data, _ in results))
        finally:
            blocker.close()

    @unittest.skipUnless(hasattr(signal, 'SIGKILL'), 'Requires process termination support')
    def test_backend_death_during_upload_recovers_without_replaying_write(self):
        config = json.loads(re.search(rb'window.ClosetLintLocal=(.*?);</script>', self.call('GET', '/')[1])[1])
        auth = {'X-ClosetLint-Token': config['token'], 'Origin': 'https://closet.example.test', 'If-Match': '"' + write_version(None) + '"'}
        self.assertEqual(self.call('PUT', '/api/doc/custom/kept', b'{"name":"Kept synthetic piece"}', auth)[0], 200)
        previous = int((self.data / 'backend.pid').read_text())
        with contextlib.closing(http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)) as conn:
            conn.putrequest('PUT', '/api/doc/custom/interrupted', skip_host=True)
            for key, value in {'Host': 'closet.example.test', **auth, 'Content-Length': '100000'}.items():
                conn.putheader(key, value)
            conn.endheaders(b'{')  # Backend is waiting for an incomplete request body.
            time.sleep(.05)
            os.kill(previous, signal.SIGKILL)
            response = conn.getresponse()
            self.assertEqual(response.status, 503)
            response.read()
        for _ in range(100):
            status, page, _ = self.call('GET', '/')
            if status == 200:
                break
            time.sleep(.03)
        self.assertEqual(status, 200, 'Gateway must recover without a hosting deployment')
        new = json.loads(re.search(rb'window.ClosetLintLocal=(.*?);</script>', page)[1])
        self.assertNotEqual(new['token'], config['token'])
        self.assertNotEqual(int((self.data / 'backend.pid').read_text()), previous)
        state = json.loads(self.call('GET', '/api/state', headers={'X-ClosetLint-Token': new['token']})[1])
        self.assertIn('kept', state['collections']['custom'])
        self.assertNotIn('interrupted', state['collections']['custom'])
        self.assertIn('SIGKILL', (self.data / 'startup.log').read_text())

    def test_sigterm_exits_even_with_an_external_keepalive_handle(self):
        self.stop()
        preload = Path(self.tmp.name) / 'supervisor-keepalive.cjs'
        preload.write_text('setInterval(()=>{},1000);\n')
        self.extra_env = {'NODE_OPTIONS': '--require=' + str(preload)}
        self.start()
        self.process.terminate()
        self.process.communicate(timeout=3)
        self.assertEqual(self.process.returncode, 0)


if __name__ == '__main__':
    unittest.main()
