"""Synthetic-only checks for the static public demo boundary."""
import base64
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
sys.path.insert(0, str(ROOT / 'runtime'))
from build_public_demo import ALL_ACTIVE, build, prepare
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
        source.payload['base']['catalog'][1]['date'] = '2001-02-03'
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
        catalog = json.loads(re.search(r'<script[^>]*id="catalog"[^>]*>(.*?)</script>', page, re.S).group(1))
        self.assertLess(catalog[0]['newestOrder'], catalog[1]['newestOrder'])
        self.assertEqual(sorted(piece['newestOrder'] for piece in catalog), list(range(len(catalog))))
        self.assertTrue(all('date' not in piece for piece in catalog))
        self.assertNotIn('2001-02-03', page)
        photos = [p for p in (target / '_blob').iterdir() if p.name != '.htaccess']
        self.assertEqual(len(photos), 12)
        self.assertTrue(all(p.suffix == '.webp' for p in photos), 'SiteGround must serve the static photos directly')

    def test_changes_after_review_require_a_new_review(self):
        self.approve()
        self.store.set_record('custom', 'later', {'name': 'Changed since review', 'meta': 'Tops'})
        with self.assertRaisesRegex(ValueError, 'changed since review'):
            build(self.store, self.review, self.root / 'stale')

    def test_site_copy_is_selected_at_build_time(self):
        self.approve()
        for site in ('demo', 'dev'):
            target = self.root / site
            self.assertEqual(build(self.store, self.review, target, site, link_peer=(site == 'dev')), 12)
            page = (target / 'index.html').read_text()
            snapshot = json.loads(re.search(r'<script[^>]*id="pubdata"[^>]*>(.*?)</script>', page, re.S).group(1))
            self.assertEqual(snapshot['site'], site)
            self.assertEqual(snapshot['peerReady'], site == 'dev')
        with self.assertRaisesRegex(ValueError, 'site copy'):
            build(self.store, self.review, self.root / 'unknown', 'unknown')

    def test_one_unapproved_photo_prevents_accidental_publication(self):
        self.approve()
        path = self.review / 'review.json'
        data = json.loads(path.read_text())
        data['pieces'][0]['photos'][0]['approved'] = False
        path.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'approved photo'):
            build(self.store, self.review, self.root / 'missing-photo')

    def test_personal_dev_includes_active_pieces_even_without_photos(self):
        self.store.set_record('custom', 'no-photo', {'name': '', 'meta': 'Tops', 'sub': 'Tees'})
        review = self.root / 'all-review'
        prepare(self.store, ALL_ACTIVE, review, 'showcase')
        manifest = json.loads((review / 'review.json').read_text())
        self.assertEqual(len(manifest['pieces']), 13)
        manifest['approved'] = True
        for piece in manifest['pieces']:
            for photo in piece['photos']:
                photo['approved'] = True
        (review / 'review.json').write_text(json.dumps(manifest))
        target = self.root / 'personal-dev'
        self.assertEqual(build(self.store, review, target, 'dev'), 13)
        catalog = json.loads(re.search(r'<script[^>]*id="catalog"[^>]*>(.*?)</script>',
                                       (target / 'index.html').read_text(), re.S).group(1))
        self.assertEqual(catalog[-1]['name'], 'Untitled tees')
        self.assertEqual(catalog[-1]['photos'], [])
        self.assertNotIn('photoId', catalog[-1])
        with self.assertRaisesRegex(ValueError, 'approved photo'):
            build(self.store, review, self.root / 'personal-as-demo', 'demo')

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

    def test_showcase_exports_selected_outfits_and_exact_wears_only(self):
        self.store.set_record('edits', 'demo-01', {
            'wears': ['2026-10-18', '2026-10-18', 'bad'],
            'price': 93, 'url': 'https://example.test/private-order'})
        self.store.set_record('outfits', 'demo-look', {
            'name': 'Everyday look', 'pieces': [
                {'id': 'demo-01', 'x': 10, 'y': 12, 'w': 34, 'z': 1},
                {'id': 'demo-04', 'x': 52, 'y': 18, 'w': 31, 'z': 2}],
            'wearLog': [{'d': '2026-10-18', 'ids': ['demo-01', 'demo-04'], 'added': ['demo-01']}],
            'notes': 'PRIVATE OUTFIT NOTE', 'plans': [{'location': 'PRIVATE LOCATION'}]})
        self.store.set_record('outfits', 'outside-collection', {
            'name': 'Do not publish', 'pieces': [{'id': 'personal-id', 'x': 1, 'y': 1, 'w': 1, 'z': 1}]})
        review = self.root / 'showcase-review'
        prepare(self.store, 'collection-imaginary', review, 'showcase')
        manifest = json.loads((review / 'review.json').read_text())
        self.assertEqual(manifest['mode'], 'showcase')
        self.assertEqual([row['public']['name'] for row in manifest['outfits']], ['Everyday look'])
        manifest['approved'] = True
        for piece in manifest['pieces']:
            piece['photos'][0]['approved'] = True
        (review / 'review.json').write_text(json.dumps(manifest))
        target = self.root / 'showcase-site'
        self.assertEqual(build(self.store, review, target), 12)
        page = (target / 'index.html').read_text()
        embedded = lambda key: json.loads(re.search(r'<script[^>]*id="' + key + r'"[^>]*>(.*?)</script>', page, re.S).group(1))
        catalog, snapshot = embedded('catalog'), embedded('pubdata')
        self.assertEqual(catalog[0]['wears'], ['2026-10-18'])
        self.assertEqual(len(snapshot['outfits']), 1)
        outfit = next(iter(snapshot['outfits'].values()))
        self.assertEqual([part['id'] for part in outfit['pieces']], [catalog[0]['id'], catalog[3]['id']])
        self.assertEqual(outfit['wearLog'], [{'d': '2026-10-18', 'ids': [catalog[0]['id'], catalog[3]['id']], 'added': [catalog[0]['id']]}])
        exported = json.dumps({'catalog': catalog, 'snapshot': snapshot})
        for secret in ('PRIVATE OUTFIT NOTE', 'PRIVATE LOCATION', 'private-order', 'Do not publish'):
            self.assertNotIn(secret, exported)
        self.assertNotIn('price', catalog[0])

        manifest['outfits'][0]['public']['name'] = 'Changed after review'
        (review / 'review.json').write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, 'Saved outfit review'):
            build(self.store, review, self.root / 'tampered-showcase')


if __name__ == '__main__':
    unittest.main()
