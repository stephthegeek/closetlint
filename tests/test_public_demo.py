"""Synthetic-only checks for the static public demo boundary."""
import base64
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
sys.path.insert(0, str(ROOT / 'runtime'))
from build_public_demo import build, prepare
from create_demo import demo_source
from storage import Store


class PublicDemoTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'data')
        source = demo_source()
        source.payload['base']['catalog'][0].update(
            rx='PRIVATE PRESCRIPTION', price=123.45, url='https://example.test/account?token=PRIVATE',
            title='PRIVATE ORDER TITLE', date='2026-10-20', wears=['2026-10-19'])
        source.payload['collections']['measurements']['private'] = {'weight': 123, 'bra': 'PRIVATE BRA'}
        self.store.restore(source)
        self.review = self.root / 'review'
        prepare(self.store, 'collection-imaginary', self.review)

    def tearDown(self):
        self.temp.cleanup()

    def approve(self):
        path = self.review / 'review.json'
        data = json.loads(path.read_text())
        data['approved'] = True
        for piece in data['pieces']:
            piece['photos'][0]['approved'] = True
        path.write_text(json.dumps(data))

    def test_review_is_private_by_default_and_public_build_strips_personal_data(self):
        self.assertTrue((self.review / 'index.html').is_file())
        with self.assertRaisesRegex(ValueError, 'explicitly approved'):
            build(self.store, self.review, self.root / 'unapproved')
        self.approve()
        target = self.root / 'site'
        self.assertEqual(build(self.store, self.review, target), 12)
        page = (target / 'index.html').read_text()
        for secret in ('PRIVATE PRESCRIPTION', 'PRIVATE ORDER TITLE', 'PRIVATE BRA',
                       'example.test/account', '2026-10-19', '123.45'):
            self.assertNotIn(secret, page)
        self.assertIn('Linty\'s imaginary closet', page)
        self.assertEqual(len([p for p in (target / '_blob').iterdir() if p.name != '.htaccess']), 12)

    def test_changes_after_review_require_a_new_review(self):
        self.approve()
        self.store.set_record('custom', 'later', {'name': 'Changed since review', 'meta': 'Tops'})
        with self.assertRaisesRegex(ValueError, 'changed since review'):
            build(self.store, self.review, self.root / 'stale')

    def test_one_unapproved_photo_prevents_accidental_publication(self):
        self.approve()
        path = self.review / 'review.json'
        data = json.loads(path.read_text())
        data['pieces'][0]['photos'][0]['approved'] = False
        path.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'approved photo'):
            build(self.store, self.review, self.root / 'missing-photo')

    def test_legacy_bundle_photo_can_be_reviewed(self):
        source = demo_source()
        first = source.payload['base']['catalog'][0]
        original = source.assets[first.pop('photoId')]
        first.pop('photos')
        bundle_id = 'b' * 32
        source.assets[bundle_id] = json.dumps({first['id']: 'data:image/jpeg;base64,' +
                                               base64.b64encode(original).decode()}).encode()
        source.payload['base']['bundles'] = [bundle_id]
        other = Store(self.root / 'legacy-data')
        other.restore(source)
        review = self.root / 'legacy-review'
        prepare(other, 'collection-imaginary', review)
        data = json.loads((review / 'review.json').read_text())
        self.assertEqual(data['pieces'][0]['photos'][0]['bundleId'], bundle_id)
        self.assertTrue((review / 'candidate-001-01.webp').is_file())


if __name__ == '__main__':
    unittest.main()
