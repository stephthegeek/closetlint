"""Photo-only updates use temporary synthetic wardrobes, never personal data."""
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
import photo_preparation as photos
from storage import Store
import test_runtime as runtime_tests
PNG = runtime_tests.PNG


class PhotoPreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'wardrobe')
        self.original = self.store.upload(PNG)
        for key in ('blue', 'pink'):
            self.store.set_record('custom', key, {'name': key + ' socks', 'colors': [key], 'styles': ['sporty'], 'photoId': self.original, 'ar': 1, 'photos': [{'photoId': self.original, 'kind': 'display', 'ar': 1}]})
        self.store.set_record('ratings', 'blue-pink', {'ids': ['c-blue', 'c-pink'], 'r': 1})
        self.store.set_record('outfits', 'worn', {'pieces': [{'id': 'c-blue'}], 'history': ['2026-10-20']})
        self.store.set_board({'pieces': [{'id': 'c-pink', 'x': 12}], 'name': 'Unfinished'})
        self.instance = self.store.state()['instance']
        self.request = photos.create(self.store, self.instance, 'test-photos', ['c-blue', 'c-pink'])
        self.base = photos.location(self.store, self.instance, 'test-photos')

    def tearDown(self):
        self.temp.cleanup()

    def prepared(self):
        # Saving/transactions do not require Pillow. Image decoding itself has a separate test.
        data = PNG
        candidate = {'file': 'prepared-synthetic.png', 'mime': 'image/png', 'sha256': __import__('hashlib').sha256(data).hexdigest(),
                     'photo': {'photoId': 'f' * 32, 'ar': 1, 'kind': 'recast', 'width': 1, 'height': 1}}
        (self.base / candidate['file']).write_bytes(data)
        result = {'photos': [{**candidate, 'id': 'c-blue'}, {**candidate, 'id': 'c-pink'}]}
        result['token'] = photos.digest(result)
        photos.write_json(self.base, 'review.json', result)
        return result['token']

    def save(self, token, ids=None):
        return photos.apply(self.store, self.instance, 'test-photos', token, ids or ['c-blue', 'c-pink'])

    def test_request_is_repeatable_and_source_zip_has_no_host_paths(self):
        before = self.store.state()
        self.assertEqual(photos.create(self.store, self.instance, 'test-photos', ['c-blue', 'c-pink']), self.request)
        with self.assertRaisesRegex(ValueError, 'another selection'):
            photos.create(self.store, self.instance, 'test-photos', ['c-pink'])
        with zipfile.ZipFile(io.BytesIO(photos.source_zip(self.store, self.instance, 'test-photos'))) as z:
            request = json.loads(z.read('request.json'))
            self.assertNotIn('folder', request)
            self.assertNotIn(str(self.root), z.read('request.json').decode())
            self.assertEqual(len(z.namelist()), 2, 'shared pack source is included once')
            self.assertNotIn('styles', request['pieces'][0])
        self.assertEqual(self.store.state(), before, 'preparing sources never saves wardrobe changes')

    def test_atomic_save_preserves_latest_tags_history_ids_and_originals(self):
        token = self.prepared()
        self.store.set_record('edits', 'c-blue', {'styles': ['updated since request'], 'laundry': True, 'worn': ['2026-10-25']})
        before = self.store.state()
        receipt = self.save(token)
        after = self.store.state()
        self.assertEqual(receipt['saved'], 2)
        for col in before['collections']:
            if col != 'edits':
                self.assertEqual(after['collections'][col], before['collections'][col])
        self.assertEqual(before['board'], after['board'])
        edit = after['collections']['edits']['c-blue']
        self.assertEqual(edit['styles'], ['updated since request'])
        self.assertEqual(edit['worn'], ['2026-10-25'])
        self.assertTrue(edit['laundry'])
        self.assertEqual(edit['photoId'], 'f' * 32)
        self.assertIn(self.original, [p['photoId'] for p in edit['photos']])
        self.assertEqual(self.store.asset(self.original)[1], PNG)
        self.assertEqual(self.save(token), receipt, 'lost response retries return the saved receipt')
        self.assertEqual(self.store.state(), after, 'retries add no photos, records, or revisions')
        with self.assertRaisesRegex(ValueError, 'different selection'):
            self.save(token, ['c-blue'])

    def test_stale_photo_or_deleted_piece_rolls_back_every_piece(self):
        token = self.prepared()
        for patch_value in ({'bg': '#eee'}, {'removed': True}):
            self.store.set_record('edits', 'c-pink', patch_value)
            before = self.store.state()
            with self.assertRaises(ValueError):
                self.save(token)
            self.assertEqual(self.store.state(), before, 'the first piece must not be partially saved')
            self.assertIsNone(photos.info(self.store, self.instance, 'test-photos')['saved'])

    def test_wrong_wardrobe_invalid_ids_and_changed_review_are_rejected(self):
        token = self.prepared()
        before = self.store.state()
        for action in (
            lambda: photos.apply(self.store, 'wrong', 'test-photos', token, ['c-blue']),
            lambda: self.save('stale'),
            lambda: self.save(token, ['new-piece']),
            lambda: self.save(token, ['c-blue', 'c-blue']),
        ):
            with self.assertRaises(ValueError):
                action()
        (self.base / 'prepared-synthetic.png').write_bytes(b'changed after review')
        with self.assertRaisesRegex(ValueError, 'reviewed photo changed'):
            self.save(token)
        self.assertEqual(self.store.state(), before)

    def test_no_duplicate_or_unexpected_piece_results_and_no_tags_in_result(self):
        for rows in ([{'id': 'new', 'file': 'x.png'}], [{'id': 'c-blue', 'styles': ['new']}],
                     [{'id': 'c-blue', 'file': 'x.png'}] * 2,
                     [{'id': 'c-blue', 'file': '../x.png'}]):
            photos.write_json(self.base, 'results.json', {'requestId': 'test-photos', 'instance': self.instance, 'photos': rows})
            with self.assertRaises(ValueError):
                photos.manifest(self.base, self.request)

    def test_zip_rejects_traversal_symlinks_and_foreign_results_before_writing(self):
        before = self.store.state()
        for invalid in ('../escape.png', '/absolute.png', 'source-fake.png'):
            output = io.BytesIO()
            with zipfile.ZipFile(output, 'w') as z:
                z.writestr(invalid, PNG)
            with self.assertRaises(ValueError):
                photos.receive(self.store, self.instance, 'test-photos', output.getvalue())
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w') as z:
            z.writestr('results.json', json.dumps({'requestId': 'wrong', 'instance': self.instance, 'photos': []}))
        with self.assertRaisesRegex(ValueError, 'different request'):
            photos.receive(self.store, self.instance, 'test-photos', output.getvalue())
        (self.base / 'outside.png').symlink_to(self.root / 'outside.png')
        photos.write_json(self.base, 'results.json', {'requestId': 'test-photos', 'instance': self.instance, 'photos': [{'id': 'c-blue', 'file': 'outside.png'}]})
        with self.assertRaises(ValueError):
            photos.normalize(self.base)
        self.assertEqual(self.store.state(), before)

    def test_care_label_main_is_not_used_as_product_reference(self):
        self.store.set_record('edits', 'c-blue', {'photos': [{'photoId': self.original, 'kind': 'carelabel'}]})
        with self.assertRaisesRegex(ValueError, 'care labels'):
            photos.create(self.store, self.instance, 'care', ['c-blue'])

    def test_changed_source_never_replaces_the_preserved_original(self):
        token = self.prepared()
        before = self.store.state()
        (self.base / self.request['pieces'][0]['source']).write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'source photo changed'):
            self.save(token)
        self.assertEqual(self.store.state(), before)
        self.assertEqual(self.store.asset(self.original)[1], PNG)

    def test_full_gallery_rejects_whole_save(self):
        token = self.prepared()
        # Start a fresh request using a valid, already-full gallery.
        self.store.set_record('edits', 'c-pink', {'photos': [{'photoId': ('%032x' % i), 'kind': 'isolated'} for i in range(10)]})
        request = photos.read_json(self.base / 'request.json')
        request['pieces'][1]['stamp'] = photos.photo_stamp(photos.piece(self.store.state(), 'c-pink'))
        photos.write_json(self.base, 'request.json', request)
        before = self.store.state()
        with self.assertRaisesRegex(ValueError, 'gallery.*full'):
            self.save(token)
        self.assertEqual(self.store.state(), before)

    def test_decode_local_and_file_results_with_real_photo_tools(self):
        try:
            from PIL import __version__
            if int(__version__.split('.')[0]) < 13:
                self.skipTest('Run photo decoder checks in the supported photo environment (Pillow 13).')
            from PIL import Image
        except ImportError:
            self.skipTest('Optional photo tools not installed')
        Image.new('RGB', (120, 240), 'blue').save(self.base / 'blue.png')
        rows = [{'id': 'c-blue', 'file': 'blue.png'}, {'id': 'c-pink', 'note': 'Editor unavailable for this item.'}]
        photos.write_json(self.base, 'results.json', {'requestId': 'test-photos', 'instance': self.instance, 'photos': rows})
        local = photos.review(self.store, self.instance, 'test-photos')
        self.assertEqual(local['photos'][0]['photo']['ar'], .5)
        self.assertNotIn('photo', local['photos'][1])
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w') as z:
            z.write(self.base / 'blue.png', 'blue.png')
            z.write(self.base / 'results.json', 'results.json')
        returned = photos.receive(self.store, self.instance, 'test-photos', output.getvalue())
        self.assertEqual(local['token'], returned['token'], 'file and local routes produce the same review')
        self.assertEqual(self.save(returned['token'], ['c-blue'])['saved'], 1)


class PhotoPreparationHTTPTests(unittest.TestCase):
    setUp = runtime_tests.RuntimeTests.setUp
    tearDown = runtime_tests.RuntimeTests.tearDown
    load = runtime_tests.RuntimeTests.load
    call = runtime_tests.RuntimeTests.call
    def test_photo_endpoints_require_token_and_preserve_state_until_save(self):
        self.load()
        instance = self.store.state()['instance']
        data = json.dumps({'instance': instance, 'request': 'http-photo', 'action': 'create', 'ids': ['c-demo']}).encode()
        self.assertEqual(self.call('POST', '/api/photos/prepare', data)[0], 403)
        status, raw = self.call('POST', '/api/photos/prepare', data, {'X-ClosetLint-Token': 'test-token'})
        self.assertEqual(status, 200, raw)
        result = json.loads(raw)
        self.assertEqual(result['pieces'][0]['id'], 'c-demo')
        path = '/api/photos/prepare?instance=' + instance + '&request=http-photo&download=1'
        self.assertEqual(self.call('GET', path)[0], 403)
        status, blob = self.call('GET', path, headers={'X-ClosetLint-Token': 'test-token'})
        self.assertEqual(status, 200)
        self.assertTrue(zipfile.is_zipfile(io.BytesIO(blob)))
