"""Assistant intake integration tests; only temporary synthetic wardrobes and images."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from piece_import import import_batch, matches, prepare_batch, product_key
from storage import Archive, Store
try:
    from PIL import Image
except ImportError:
    Image = None

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(Image, "Install runtime/requirements-import.txt for photo-import checks")
class PieceImportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.bundle = self.root / 'batch'
        self.bundle.mkdir()
        self.store = Store(self.root / 'wardrobe')
        self.image('isolated.png', (1800, 900), 'RGBA')
        self.image('model.jpg', (100, 200))
        self.piece = {'name': 'Synthetic tee', 'category': 'Tops', 'subcategory': 'Tees', 'status': 'wishlist', 'size': 'XXL', 'retailer': 'Example', 'price': '12.50', 'url': 'https://www.temu.com/tee-g-123.html', 'colors': ['black'], 'images': [{'file': 'isolated.png', 'kind': 'isolated'}, {'file': 'model.jpg', 'kind': 'model'}], 'labAs': 'top', 'layerNeed': 'none', 'weight': 'thin'}

    def tearDown(self):
        self.tmp.cleanup()

    def image(self, name, size, mode='RGB', **kwargs):
        image = Image.new(mode, size, (130, 100, 160, 100) if mode == 'RGBA' else (90, 110, 120))
        image.save(self.bundle / name, **kwargs)

    def prepare(self, pieces=None, batch='synthetic-1', **kwargs):
        path = self.bundle / 'import.json'
        path.write_text(json.dumps({'format': 'closet-lint-import/v1', 'batchId': batch, 'pieces': pieces if pieces is not None else [self.piece]}))
        return prepare_batch(path, **kwargs)

    def test_twelve_photo_limit_includes_primary_photo_file(self):
        images = []
        for i in range(12):
            name = f'view-{i}.png'
            self.image(name, (24 + i, 32))
            images.append({'file': name, 'kind': 'isolated'})
        prepared = self.prepare([{**self.piece, 'images': images}])
        self.assertEqual(len(prepared[2][0]['record']['photos']), 12)
        with self.assertRaisesRegex(ValueError, 'at most 12'):
            self.prepare([{**self.piece, 'images': images + [images[0]]}])
        with self.assertRaisesRegex(ValueError, 'at most 12'):
            self.prepare([{**self.piece, 'images': images, 'photoFile': 'model.jpg'}])

    def test_preview_apply_gallery_and_retry(self):
        prepared = self.prepare()
        before = self.store.state()
        report = import_batch(self.store, *prepared)
        self.assertEqual(report['mode'], 'preview')
        self.assertEqual(report['added'], 1)
        self.assertEqual(self.store.state(), before)
        report = import_batch(self.store, *prepared, apply=True)
        self.assertEqual((report['added'], report['photosSaved']), (1, 2))
        state = self.store.state()
        key, rec = next(iter(state['collections']['custom'].items()))
        self.assertEqual(report['results'][0]['id'], 'c-' + key)
        self.assertEqual(rec['photoId'], rec['photos'][0]['photoId'])
        self.assertEqual([p['kind'] for p in rec['photos']], ['isolated', 'model'])
        self.assertEqual([(p['width'], p['height']) for p in rec['photos']], [(1600, 800), (100, 200)])
        self.assertTrue(rec['wish']);self.assertFalse(rec['noPhoto'])
        self.assertEqual(rec['layerNeed'], 'none');self.assertEqual(rec['price'], 12.5)
        retry = import_batch(self.store, *self.prepare(), apply=True)
        self.assertEqual(retry['mode'], 'already-applied')
        self.assertFalse(retry['committed'])
        self.assertEqual((retry['added'], retry['promoted'], retry['photosSaved']), (0, 0, 0))
        self.assertEqual(self.store.state(), state)
        self.piece['price'] = '13.00'
        with self.assertRaisesRegex(ValueError, 'different content'):
            import_batch(self.store, *self.prepare(), apply=True)
        self.assertEqual(self.store.state(), state)

    def test_duplicates_variants_in_batch_and_against_effective_catalog(self):
        with self.store.connect() as db:
            self.store.put_meta(db, 'base', {'catalog': [{'id': 'old', 'name': 'Old name', 'size': 'M'}], 'tags': {}, 'bundles': []})
        self.store.set_record('edits', 'old', {'name': 'Synthetic tee', 'size': 'XXL', 'url': self.piece['url'], 'colors': ['black']})
        other = {**self.piece, 'variant': 'red', 'colors': ['red']}
        report = import_batch(self.store, *self.prepare([self.piece, other, other]), apply=True)
        self.assertEqual((report['added'], report['skipped']), (1, 2))
        self.assertEqual(report['results'][0]['matches'], ['old'])
        self.assertEqual(len(self.store.state()['collections']['custom']), 1)
        self.assertEqual(len(self.store.state()['collections']['edits']), 1)

    def test_wishlist_promotion_changes_ownership_only(self):
        self.store.set_record('custom', 'old', {'name': self.piece['name'], 'size': 'XXL', 'wish': True, 'price': 9, 'wears': ['2026-01-01'], 'fav': True, 'photoId': 'a' * 32})
        self.store.set_record('edits', 'c-old', {'source': 'Keep me'})
        self.piece['status'] = 'owned'
        before = self.store.state()['collections']['custom']['old']
        report = import_batch(self.store, *self.prepare(), apply=True, promote_wishlist=True)
        self.assertEqual((report['promoted'], report['added'], report['photosSaved']), (1, 0, 0))
        after = self.store.state()
        self.assertEqual(after['collections']['custom']['old'], before)
        self.assertEqual(after['collections']['edits']['c-old'], {'source': 'Keep me', 'wish': False})

    def test_validation_failure_and_commit_failure_leave_no_partial_records_or_photos(self):
        before = self.store.state()
        with self.assertRaisesRegex(ValueError, 'Piece 2'):
            self.prepare([self.piece, {**self.piece, 'price': '-1'}])
        self.assertEqual(self.store.state(), before)
        prepared = self.prepare()
        old_bump = self.store.bump
        self.store.bump = lambda db: (_ for _ in ()).throw(OSError('synthetic disk failure'))
        with self.assertRaises(OSError):
            import_batch(self.store, *prepared, apply=True)
        self.store.bump = old_bump
        self.assertEqual(self.store.state(), before)

    def test_files_and_invalid_images_fail_closed(self):
        (self.root / 'outside.png').write_bytes((self.bundle / 'isolated.png').read_bytes())
        for images in [[{'file': '../outside.png'}], [{'file': str(self.root / 'outside.png')}], [{'url': 'https://example.com/photo.jpg'}], [{'file': 'missing.png'}]]:
            with self.assertRaises(ValueError):self.prepare([{**self.piece, 'images': images}])
        (self.bundle / 'escape.png').symlink_to(self.root / 'outside.png')
        with self.assertRaises(ValueError):self.prepare([{**self.piece, 'images': [{'file': 'escape.png'}]}])
        (self.bundle / 'not-a-photo.jpg').write_text('<html>Not an image</html>')
        with self.assertRaisesRegex(ValueError, 'decoded'):
            self.prepare([{**self.piece, 'images': [{'file': 'not-a-photo.jpg'}]}])
        with self.assertRaisesRegex(ValueError, 'No local photo'):
            self.prepare([{**self.piece, 'images': []}])
        _, _, rows = self.prepare([{**self.piece, 'images': []}], allow_no_photo=True)
        self.assertTrue(rows[0]['record']['noPhoto'])

    def test_metadata_allowlist_unknown_tags_and_sizes(self):
        _, _, rows = self.prepare([{**self.piece, 'address': 'must not be stored', 'photoId': 'x', 'colors': ['black', 'clear', 'imaginary'], 'looks': ['geeky', 'utility'], 'pattern': ['animal', 'botanical'], 'date': '2026-10-15', 'imageSources': [{'url': 'https://example.com/alternate.jpg', 'kind': 'detail'}]}])
        record = rows[0]['record']
        self.assertNotIn('address', record);self.assertNotEqual(record['photoId'], 'x')
        self.assertEqual(record['colors'], ['black', 'clear']);self.assertEqual(record['date'], '2026-10-15')
        self.assertEqual(record['looks'], ['geeky', 'utility']);self.assertEqual(record['pattern'], ['animal', 'botanical'])
        self.assertTrue(rows[0]['warnings'])
        self.assertEqual(record['imageSources'][0]['kind'], 'detail')
        for patch in [{'price': True}, {'price': '1e9'}, {'price': '1.234'}, {'price': 2, 'currency': 'CAD'}, {'url': 'file:///tmp/x'}, {'category': 'Unknown'}, {'subcategory': 'Imaginary'}, {'layerNeed': 'maybe'}, {'date': '2026-99-99'}]:
            with self.assertRaises(ValueError):self.prepare([{**self.piece, **patch}])
        with self.assertRaisesRegex(ValueError, 'Ring size'):
            self.prepare([{**self.piece, 'category': 'Jewelry', 'subcategory': 'Rings', 'size': 'XXL'}])

    def test_orientation_exif_stripping_transparency_and_no_upscale(self):
        exif = Image.Exif();exif[274] = 6;exif[315] = 'Synthetic private metadata'
        self.image('rotated.jpg', (2000, 1000), exif=exif)
        _, _, rows = self.prepare([{**self.piece, 'images': [{'file': 'rotated.jpg', 'kind': 'model'}]}])
        photo = rows[0]['record']['photos'][0]
        self.assertEqual((photo['width'], photo['height']), (800, 1600))
        with Image.open(io.BytesIO(rows[0]['assets'][photo['photoId']][1])) as pic:
            self.assertEqual(len(pic.getexif()), 0)
        _, _, rows = self.prepare()
        photo = rows[0]['record']['photos'][0]
        with Image.open(io.BytesIO(rows[0]['assets'][photo['photoId']][1])) as pic:
            self.assertEqual(pic.mode, 'RGBA');self.assertEqual(pic.getextrema()[3], (100, 100))

    def test_receipt_roundtrips_with_backups(self):
        # Bare UUID-like batch IDs must not be mistaken for photo references.
        prepared = self.prepare(batch='a' * 32)
        import_batch(self.store, *prepared, apply=True)
        backup = self.root / 'backup.zip';self.store.export(backup)
        restored = Store(self.root / 'restored')
        with contextlib.closing(Archive(backup)) as a:restored.restore(a)
        report = import_batch(restored, *prepared, apply=True)
        self.assertEqual(report['mode'], 'already-applied')
        self.assertEqual(len(restored.state()['collections']['custom']), 1)

    def test_simultaneous_retries_commit_once(self):
        prepared = self.prepare();barrier = threading.Barrier(2);reports=[];errors=[]
        def run():
            try:
                barrier.wait();reports.append(import_batch(self.store, *prepared, apply=True))
            except Exception as error:errors.append(error)
        threads = [threading.Thread(target=run) for _ in range(2)]
        for t in threads:t.start()
        for t in threads:t.join()
        self.assertEqual(errors, [])
        self.assertEqual(sorted(r['mode'] for r in reports), ['already-applied', 'applied'])
        self.assertEqual(len(self.store.state()['collections']['custom']), 1)

    def test_cli_schema_apply_and_wrong_target(self):
        self.prepare()
        command = [sys.executable, str(ROOT / 'tools/import_pieces.py')]
        schema = subprocess.run(command + ['--schema'], capture_output=True, text=True)
        self.assertEqual(schema.returncode, 0);self.assertIn('vocabulary', json.loads(schema.stdout))
        args = ['--data', str(self.store.folder), '--file', str(self.bundle / 'import.json')]
        preview = subprocess.run(command + args, capture_output=True, text=True)
        self.assertEqual(preview.returncode, 0, preview.stderr);self.assertEqual(json.loads(preview.stdout)['mode'], 'preview')
        applied = subprocess.run(command + args + ['--apply'], capture_output=True, text=True)
        self.assertEqual(applied.returncode, 0, applied.stderr);self.assertEqual(json.loads(applied.stdout)['added'], 1)
        bad = subprocess.run(command + ['--data', str(self.root / 'typo'), '--file', str(self.bundle / 'import.json'), '--apply'], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 2);self.assertFalse((self.root / 'typo').exists())

    def test_share_links_variants_and_removed_items(self):
        self.assertNotEqual(product_key('https://share.temu.com/one'), product_key('https://share.temu.com/two'))
        self.assertFalse(matches({**self.piece, 'variant': 'red'}, {**self.piece, 'variant': 'grey'}))
        self.store.set_record('custom', 'removed', {'name': self.piece['name'], 'size': 'XXL', 'removed': True})
        report = import_batch(self.store, *self.prepare(), apply=True)
        self.assertEqual(report['added'], 1)


if __name__ == '__main__':unittest.main()
