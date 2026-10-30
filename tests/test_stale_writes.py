"""Two-editor save protection, using only disposable wardrobes."""
import concurrent.futures
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
from types import SimpleNamespace
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Store, WriteConflict, encode, write_version, write_versions
from server import Handler


class Connection:
    def __init__(self, raw):
        self.input, self.output = io.BytesIO(raw), bytearray()

    def makefile(self, *args, **kwargs):
        return self.input

    def sendall(self, data):
        self.output.extend(data)


class StaleWriteTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.tmp.name) / 'data')
        self.server = SimpleNamespace(host='127.0.0.1', store=self.store, token='test-token',
                                      server_address=('127.0.0.1', 6684), tickets={}, mutation_lock=threading.RLock())

    def tearDown(self):
        self.tmp.cleanup()

    def call(self, method, path, value=None, version=None):
        body = encode(value).encode() if value is not None else b''
        headers = {'Host': '127.0.0.1:6684', 'Content-Length': str(len(body)), 'X-ClosetLint-Token': 'test-token'}
        if version is not None:
            headers['If-Match'] = '"' + version + '"'
        raw = (method + ' ' + path + ' HTTP/1.0\r\n' + ''.join(k + ': ' + v + '\r\n' for k, v in headers.items()) + '\r\n').encode() + body
        conn = Connection(raw)
        Handler(conn, ('127.0.0.1', 1234), self.server)
        head, data = bytes(conn.output).split(b'\r\n\r\n', 1)
        return int(head.split()[1]), json.loads(data)

    def state(self):
        return self.call('GET', '/api/state')[1]

    def test_old_tabs_cannot_write_without_a_version(self):
        before = self.store.state()
        for method, path, value in [('PUT', '/api/doc/edits/piece', {'fav': True}),
                                    ('DELETE', '/api/doc/edits/piece', None),
                                    ('PUT', '/api/board', {'pieces': []})]:
            self.assertEqual(self.call(method, path, value)[0], 428)
            self.assertEqual(self.store.state(), before)

    def test_second_editor_and_stale_delete_cannot_overwrite_newer_piece(self):
        self.store.set_record('edits', 'piece', {'note': 'original'})
        a, b = self.state(), self.state()
        version = a['writeVersions']['collections']['edits']['piece']
        status, receipt = self.call('PUT', '/api/doc/edits/piece', {'note': 'phone'}, version)
        self.assertEqual(status, 200)
        self.assertNotEqual(receipt['version'], version)
        before = self.store.state()
        for method, value in [('PUT', {'note': 'old laptop'}), ('DELETE', None)]:
            status, error = self.call(method, '/api/doc/edits/piece', value, b['writeVersions']['collections']['edits']['piece'])
            self.assertEqual(status, 409)
            self.assertEqual(error['code'], 'stale-edit')
            self.assertEqual(self.store.state(), before)

    def test_versions_are_per_record_and_notice_direct_tool_changes(self):
        self.store.set_record('edits', 'a', {'note': 'first'})
        self.store.set_record('edits', 'b', {'note': 'second'})
        old = self.state()['writeVersions']['collections']['edits']
        # Direct import/photo tools also update saved content outside the HTTP lock.
        with self.store.connect() as db:
            db.execute('UPDATE documents SET payload=? WHERE collection=? AND id=?', (encode({'note': 'tool edit'}), 'edits', 'a'))
        self.assertEqual(self.call('PUT', '/api/doc/edits/a', {'note': 'stale'}, old['a'])[0], 409)
        self.store.upload(b'GIF89a\x01\x00\x01\x00' + b'\0' * 20)
        self.assertEqual(self.call('PUT', '/api/doc/edits/b', {'note': 'independent'}, old['b'])[0], 200)

    def test_create_collision_and_exact_lost_response_retry(self):
        missing = write_version(None)
        value = {'name': 'Synthetic new piece'}
        self.assertEqual(self.call('PUT', '/api/doc/custom/new', value, missing)[0], 200)
        before = self.store.state()
        self.assertEqual(self.call('PUT', '/api/doc/custom/new', value, missing)[0], 200)
        self.assertEqual(self.store.state(), before, 'retry cannot reset addedAt or bump revision')
        self.assertEqual(self.call('PUT', '/api/doc/custom/new', {'name': 'Other editor'}, missing)[0], 409)
        self.assertEqual(self.store.state(), before)
        current = self.state()['writeVersions']['collections']['custom']['new']
        self.assertEqual(self.call('DELETE', '/api/doc/custom/new', version=current)[0], 200)
        before = self.store.state()
        self.assertEqual(self.call('DELETE', '/api/doc/custom/new', version=current)[0], 200)
        self.assertEqual(self.store.state(), before)

    def test_board_conflict_and_exact_retry_keep_layout_and_outfits(self):
        original = {'name': 'Original', 'pieces': []}
        self.store.set_board(original)
        old = self.state()['writeVersions']['board']
        latest = {'name': 'Phone board', 'pieces': [{'id': 'synthetic', 'x': 15}]}
        self.assertEqual(self.call('PUT', '/api/board', latest, old)[0], 200)
        before = self.store.state()
        self.assertEqual(self.call('PUT', '/api/board', latest, old)[0], 200)
        self.assertEqual(self.store.state(), before)
        self.assertEqual(self.call('PUT', '/api/board', {'name': 'Old tab', 'pieces': []}, old)[0], 409)
        self.assertEqual(self.store.state(), before)

    def test_compare_and_write_are_atomic_across_connections(self):
        self.store.set_record('edits', 'piece', {'note': 'initial'})
        old = write_version({'note': 'initial'})
        barrier = threading.Barrier(2)

        def edit(note):
            barrier.wait()
            try:
                self.store.set_record('edits', 'piece', {'note': note}, expected=old)
                return True
            except WriteConflict:
                return False

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(edit, ['phone', 'computer'])), [False, True])

    def test_canonical_versions_ignore_json_key_order(self):
        self.assertEqual(write_version({'a': 1, 'b': 2}), write_version({'b': 2, 'a': 1}))
        self.assertNotEqual(write_version(None), write_version({}))


if __name__ == '__main__':
    unittest.main()
