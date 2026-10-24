"""Synthetic fixtures only. Exercises persistence and HTTP handlers without network sockets."""
import base64
import contextlib
import io
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Archive, COLLECTIONS, Store, encode
from server import Handler, render_app

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=')
PHOTO = 'a' * 32
BUNDLE = 'b' * 32


def fixture():
    cols = {col: {} for col in COLLECTIONS}
    cols['custom']['demo'] = {'name': 'Synthetic tee', 'meta': 'Tops', 'size': 'XXL', 'photoId': PHOTO}
    cols['ratings']['demo+skirt'] = {'ids': ['demo', 'skirt'], 'r': 1}
    cols['profile']['photoMap'] = {'map': {'demo-base': [PHOTO, 1]}}
    cols['views']['_seeded'] = {'at': 1}
    return {'app': 'closet-lint', 'kind': 'full-backup', 'formatVersion': 1, 'collections': cols,
            'base': {'catalog': [{'id': 'demo-base', 'name': 'Synthetic base', 'size': '2XL'}], 'tags': {}, 'bundles': [BUNDLE]},
            'board': {'name': 'Demo board', 'pieces': [{'id': 'c-demo', 'x': 10, 'y': 20, 'w': 30, 'z': 1}]}}


def archive(path, payload=None, assets=None):
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('backup.json', encode(payload or fixture()))
        for key, value in (assets if assets is not None else {PHOTO: PNG, BUNDLE: b'{}'}).items():
            z.writestr(('catalog-photos/' if key == BUNDLE else 'photos/') + key, value)
    return path


class Connection:
    def __init__(self, raw):
        self.input = io.BytesIO(raw)
        self.output = bytearray()

    def makefile(self, *args, **kwargs):
        return self.input

    def sendall(self, data):
        self.output.extend(data)


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'store')
        self.backup = archive(self.root / 'fixture.zip')

    def tearDown(self):
        self.temp.cleanup()

    def load(self):
        with contextlib.closing(Archive(self.backup)) as a:
            self.store.restore(a)

    def test_persists_records_upload_and_board_after_reopening(self):
        photo = self.store.upload(PNG)
        self.store.set_record('custom', 'new', {'name': 'Demo', 'size': 'XXL', 'photoId': photo})
        self.store.set_board({'pieces': [{'id': 'c-new'}], 'name': 'Unsaved board'})
        reopened = Store(self.root / 'store')
        self.assertEqual(reopened.state()['collections']['custom']['new']['size'], 'XXL')
        self.assertEqual(reopened.asset(photo), ('image/png', PNG))
        self.assertEqual(reopened.state()['board']['pieces'][0]['id'], 'c-new')
        reopened.delete_record('custom', 'new')
        self.assertEqual(Store(self.root / 'store').state()['collections']['custom'], {})

    def test_prelaunch_brand_export_and_original_backup_restore(self):
        payload = fixture()
        payload['app'] = 'lint-goblin'  # Historical backup label, not the active runtime identity.
        old = archive(self.root / 'original-backup.zip', payload)
        with contextlib.closing(Archive(old)) as source:
            self.store.restore(source)
        target = self.root / 'closetlint-backup.zip'
        self.store.export(target)
        with zipfile.ZipFile(target) as z:
            self.assertEqual(json.loads(z.read('backup.json'))['app'], 'closet-lint')
            self.assertIn('Closet Lint', z.read('README.txt').decode())
        with contextlib.closing(Archive(target)) as exported:
            self.assertEqual(exported.payload['collections'], payload['collections'])
            self.assertEqual(exported.payload['board'], payload['board'])

    def test_wishlist_pass_and_ranking_survive_full_backup(self):
        self.load()
        ranking = {'r': {'c-demo': {'s': 1720, 'n': 3}}, 't': {'a': 1600, 'b': 1460},
                   'pass': {'c-demo': True}, 'v': 1}
        self.store.set_record('wishrank', 'main', ranking)
        target = self.root / 'pass-backup.zip'
        self.store.export(target)
        restored = Store(self.root / 'pass-restored')
        with contextlib.closing(Archive(target)) as exported:
            restored.restore(exported)
        self.assertEqual(restored.state()['collections']['wishrank']['main'], ranking)

    def test_complete_roundtrip_preserves_every_collection_base_board_and_asset(self):
        self.load()
        for col in COLLECTIONS:
            self.store.set_record(col, 'roundtrip', {'note': col})
        target = self.root / 'export.zip'
        self.store.export(target)
        other = Store(self.root / 'restored')
        with contextlib.closing(Archive(target)) as a:
            other.restore(a)
        for key in ('collections', 'base', 'board', 'photos'):
            self.assertEqual(other.state()[key], self.store.state()[key])
        self.assertEqual(other.verification()['assetHashes'], self.store.verification()['assetHashes'])
        self.assertEqual(other.verification()['integrity'], 'ok')

    def test_nonempty_import_refuses_replacement_and_restore_keeps_recovery(self):
        self.load()
        self.store.set_record('custom', 'keep', {'name': 'Old record'})
        with contextlib.closing(Archive(self.backup)) as a:
            with self.assertRaises(ValueError):
                self.store.restore(a)
            recovery = self.store.restore(a, replace=True)
        self.assertNotIn('keep', self.store.state()['collections']['custom'])
        with sqlite3.connect(recovery) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM documents WHERE id='keep'").fetchone()[0], 1)

    def test_failure_halfway_through_restore_rolls_back_everything(self):
        self.load()
        before = self.store.state()
        class Broken:
            payload = fixture()
            assets = [PHOTO, BUNDLE]
            def read_asset(self, key):
                if key == BUNDLE:
                    raise OSError('Simulated disk read failure')
                return PNG
        with self.assertRaises(OSError):
            self.store.restore(Broken(), replace=True)
        self.assertEqual(self.store.state(), before)
        self.assertEqual(self.store.asset(PHOTO)[1], PNG)

    def test_missing_asset_partial_export_and_unknown_collection_are_rejected(self):
        archive(self.root / 'missing.zip', assets={PHOTO: PNG})
        with self.assertRaises(ValueError):
            Archive(self.root / 'missing.zip')
        payload = fixture(); payload['collections'].pop('profile')
        archive(self.root / 'partial.zip', payload)
        with self.assertRaises(ValueError):
            Archive(self.root / 'partial.zip')
        for col, key in [('unknown', 'id'), ('custom', '../bad'), ('custom', 'bad\x00')]:
            with self.assertRaises(ValueError):
                self.store.set_record(col, key, {})

    def test_invalid_file_and_duplicate_zip_paths_are_rejected(self):
        bad = self.root / 'bad.zip'
        archive(bad, assets={PHOTO: b'<script>bad</script>', BUNDLE: b'{}'})
        with self.assertRaises(ValueError):
            Archive(bad)
        archive(bad)
        with zipfile.ZipFile(bad, 'a') as z:
            z.writestr('../escape', b'bad')
        with self.assertRaises(ValueError):
            Archive(bad)
        self.assertFalse((self.root / 'escape').exists())

    def test_served_html_escapes_data_and_contains_runtime_without_public_snapshot(self):
        self.load()
        with self.store.connect() as db:
            base = self.store.meta(db, 'base')
            base['catalog'][0]['name'] = '</script><script>bad()</script>'
            self.store.put_meta(db, 'base', base)
        page = render_app(self.store, 'test-token')
        self.assertIn('window.ClosetLintLocal=', page)
        self.assertIn('src="/runtime.js"', page)
        self.assertNotIn('<script>bad()', page)
        self.assertIn('\\u003c/script\\u003e', page)
        self.assertIn('id="pubdata">{}</script>', page)

    def call(self, method, path, body=b'', headers=None):
        if not hasattr(self, 'server'):
            self.server = SimpleNamespace(host='127.0.0.1', password=None, store=self.store, token='test-token', server_address=('127.0.0.1', 6684), tickets={}, mutation_lock=threading.RLock())
        h = {'Host': '127.0.0.1:6684', 'Content-Length': str(len(body))}
        h.update(headers or {})
        raw = (method + ' ' + path + ' HTTP/1.0\r\n' + ''.join(k + ': ' + v + '\r\n' for k, v in h.items()) + '\r\n').encode() + body
        connection = Connection(raw)
        Handler(connection, ('127.0.0.1', 1234), self.server)
        head, data = bytes(connection.output).split(b'\r\n\r\n', 1)
        self.response_headers = dict(line.split(': ', 1) for line in head.decode().split('\r\n')[1:])
        return int(head.split()[1]), data

    def test_weather_lookup_requires_local_token_and_recovers(self):
        with patch('server.lookup_weather', return_value={'daily': {}, 'years': [2023, 2025]}) as lookup:
            self.assertEqual(self.call('GET', '/api/weather?latitude=48.4&longitude=-123.3')[0], 403)
            lookup.assert_not_called()
            token = {'X-ClosetLint-Token': 'test-token'}
            status, data = self.call('GET', '/api/weather?latitude=48.4&longitude=-123.3', headers=token)
            self.assertEqual(status, 200)
            lookup.assert_called_once_with('48.4', '-123.3')
        for exception, status in [(ValueError, 400), (TimeoutError, 502)]:
            with patch('server.lookup_weather', side_effect=exception):
                actual, data = self.call('GET', '/api/weather?latitude=0&longitude=0', headers=token)
                self.assertEqual(actual, status)
                self.assertIn('temperatures yourself', json.loads(data)['error'])

    def test_photo_cache_revalidates_and_detects_changed_bytes_after_restore(self):
        self.load()
        self.assertEqual(self.call('GET', '/_blob/' + PHOTO), (200, PNG))
        etag = self.response_headers['ETag']
        self.assertEqual(self.response_headers['Cache-Control'], 'private, no-cache')
        for condition in (etag, 'W/' + etag, '"other", ' + etag, '*'):
            self.assertEqual(self.call('GET', '/_blob/' + PHOTO,
                                      headers={'If-None-Match': condition}), (304, b''))
            self.assertEqual(self.response_headers['ETag'], etag)
            self.assertNotIn('Content-Length', self.response_headers)
        changed = PNG + b'changed backup photo'
        replacement = archive(self.root / 'replacement.zip', assets={PHOTO: changed, BUNDLE: b'{}'})
        with contextlib.closing(Archive(replacement)) as source:
            self.store.restore(source, replace=True)
        self.assertEqual(self.call('GET', '/_blob/' + PHOTO,
                                  headers={'If-None-Match': etag}), (200, changed))
        self.assertNotEqual(self.response_headers['ETag'], etag)
        self.assertEqual(self.call('GET', '/_blob/' + PHOTO, headers={
            'If-None-Match': '*', 'Sec-Fetch-Site': 'cross-site'})[0], 403)
        self.assertEqual(self.response_headers['Cache-Control'], 'no-store')
        self.assertEqual(self.call('GET', '/_blob/' + 'f' * 32,
                                  headers={'If-None-Match': '*'})[0], 404)
        self.assertEqual(self.response_headers['Cache-Control'], 'no-store')
        self.call('GET', '/api/state', headers={'X-ClosetLint-Token': 'test-token'})
        self.assertEqual(self.response_headers['Cache-Control'], 'no-store')
        self.call('GET', '/')
        self.assertEqual(self.response_headers['Cache-Control'], 'no-store')

    def test_http_gate_rejects_other_origins_hosts_and_missing_tokens(self):
        for headers in [{}, {'X-ClosetLint-Token': 'wrong'}, {'X-ClosetLint-Token': 'test-token', 'Origin': 'https://other.example'}, {'X-ClosetLint-Token': 'test-token', 'Host': 'other.example'}, {'X-ClosetLint-Token': 'test-token', 'Sec-Fetch-Site': 'cross-site'}]:
            status, _ = self.call('PUT', '/api/doc/custom/demo', b'{}', headers)
            self.assertEqual(status, 403)
        status, _ = self.call('GET', '/db/profile/wear.json')
        self.assertEqual(status, 404)
        status, _ = self.call('GET', '/api/state')
        self.assertEqual(status, 403)

    def test_thumbnail_http_fallback_preview_and_private_cache_revalidation(self):
        self.load()
        self.call('GET', '/')
        self.server.thumbnails = SimpleNamespace(enabled=True, get=lambda key, asset: None)
        self.assertEqual(self.call('GET', '/_thumb/' + PHOTO), (200, PNG))
        original_tag = self.response_headers['ETag']
        preview = b'RIFF\0\0\0\0WEBPsynthetic'
        self.server.thumbnails.get = lambda key, asset: preview
        self.assertEqual(self.call('GET', '/_thumb/' + PHOTO,
                                  headers={'If-None-Match': original_tag}), (200, preview))
        self.assertEqual(self.response_headers['Content-Type'], 'image/webp')
        self.assertEqual(self.response_headers['Cache-Control'], 'private, no-cache')
        self.assertEqual(self.call('GET', '/_thumb/' + PHOTO,
                                  headers={'If-None-Match': self.response_headers['ETag']}), (304, b''))
        self.assertEqual(self.call('GET', '/_blob/' + PHOTO), (200, PNG), 'full-size photo is untouched')
        self.assertEqual(self.call('GET', '/_thumb/' + PHOTO,
                                  headers={'Sec-Fetch-Site': 'cross-site'})[0], 403)

    def test_city_lookup_needs_same_origin_token_and_has_manual_entry_recovery(self):
        token = {'X-ClosetLint-Token': 'test-token'}
        with patch('server.lookup_places', return_value={'places': [{'label': 'Synthetic city'}]}) as lookup:
            self.assertEqual(self.call('GET', '/api/places?name=Synthetic')[0], 403)
            lookup.assert_not_called()
            status, data = self.call('GET', '/api/places?name=Synthetic', headers=token)
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(data)['places'][0]['label'], 'Synthetic city')
            self.assertEqual(self.response_headers['Cache-Control'], 'no-store')
        with patch('server.lookup_places', side_effect=TimeoutError):
            status, data = self.call('GET', '/api/places?name=Synthetic', headers=token)
            self.assertEqual(status, 502)
            self.assertIn('enter any destination', json.loads(data)['error'])

    def test_cross_site_top_level_visit_opens_app_but_not_api_or_photos(self):
        navigation = {'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate',
                      'Sec-Fetch-Dest': 'document'}
        self.assertEqual(self.call('GET', '/', headers=navigation)[0], 200)
        self.assertEqual(self.call('GET', '/api/state', headers={**navigation, 'X-ClosetLint-Token': 'test-token'})[0], 403)
        self.assertEqual(self.call('GET', '/_blob/' + PHOTO, headers=navigation)[0], 403)
        self.assertEqual(self.call('GET', '/', headers={**navigation, 'Origin': 'https://other.example'})[0], 403)
        self.assertEqual(self.call('GET', '/', headers={**navigation, 'Sec-Fetch-Dest': 'image'})[0], 403)

    def test_lan_no_login_keeps_origin_and_api_token_checks(self):
        self.call('GET', '/')
        self.server.host = '10.0.0.20'
        host = {'Host': '10.0.0.20:6684'}
        self.assertEqual(self.call('GET', '/', headers=host)[0], 200)
        self.assertEqual(self.call('GET', '/api/state', headers=host)[0], 403)
        auth = dict(host, **{'X-ClosetLint-Token': 'test-token', 'Origin': 'http://10.0.0.20:6684'})
        self.assertEqual(self.call('GET', '/api/state', headers=auth)[0], 200)
        auth['Origin'] = 'http://untrusted.example'
        self.assertEqual(self.call('GET', '/api/state', headers=auth)[0], 403)

    def test_http_save_reload_backup_preview_cancel_and_explicit_restore(self):
        token = {'X-ClosetLint-Token': 'test-token', 'Origin': 'http://127.0.0.1:6684'}
        self.assertEqual(self.call('PUT', '/api/doc/custom/demo', b'{"name":"Synthetic"}', token)[0], 200)
        status, data = self.call('GET', '/api/state', headers=token)
        self.assertEqual(json.loads(data)['collections']['custom']['demo']['name'], 'Synthetic')
        status, data = self.call('POST', '/api/restore/preview', self.backup.read_bytes(), token)
        self.assertEqual(status, 200)
        ticket = json.loads(data)['ticket']
        # Preview does not mutate the wardrobe.
        self.assertEqual(self.store.state()['photos'], 0)
        self.assertEqual(self.call('POST', '/api/restore/apply', encode({'ticket': ticket}).encode(), token)[0], 400)
        self.assertEqual(self.call('POST', '/api/restore/apply', encode({'ticket': ticket, 'confirm': 'replace-wardrobe'}).encode(), token)[0], 200)
        self.assertEqual(self.store.state()['photos'], 2)
        self.assertEqual(self.call('POST', '/api/restore/apply', encode({'ticket': ticket, 'confirm': 'replace-wardrobe'}).encode(), token)[0], 400)
        status, data = self.call('GET', '/api/backup', headers=token)
        self.assertEqual(status, 200)
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            self.assertIn('base', json.loads(z.read('backup.json')))
        status, data = self.call('POST', '/api/restore/preview', self.backup.read_bytes(), token)
        ticket = json.loads(data)['ticket']
        self.assertEqual(self.call('POST', '/api/restore/cancel', encode({'ticket': ticket}).encode(), token)[0], 200)
        self.assertFalse(self.server.tickets)
        self.assertFalse(list((self.store.folder / 'staging').glob('*.zip')))


if __name__ == '__main__':
    unittest.main()
