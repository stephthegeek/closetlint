"""Legacy bundled photos become read-only individual URLs, without database migration."""
import base64
import contextlib
import json
from pathlib import Path
import re
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Archive, Store
from catalog_photos import CatalogPhotos
from server import render_app
from thumbnails import ThumbnailCache
import test_runtime as rt


class CatalogPhotoTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'synthetic')
        self.restore(rt.PNG)
        self.catalog = CatalogPhotos(self.store)

    def tearDown(self):
        self.temp.cleanup()

    def restore(self, photo):
        bundle = json.dumps({'legacy-photo': 'data:image/png;base64,' + base64.b64encode(photo).decode()}).encode()
        backup = rt.archive(self.root / 'fixture.zip', assets={rt.PHOTO: rt.PNG, rt.BUNDLE: bundle})
        with contextlib.closing(Archive(backup)) as source:
            self.store.restore(source, replace=True)

    def test_individual_photos_skip_bundle_downloads_without_optional_packages(self):
        before = self.store.verification()
        photos = self.catalog.refresh([rt.BUNDLE])
        key = photos['legacy-photo'].split('/')[-1]
        self.assertEqual(self.catalog.asset(key), ('image/png', rt.PNG))
        self.assertIsNone(self.catalog.asset('../../wardrobe.sqlite3'))
        page = render_app(self.store, 'synthetic', catalog=self.catalog)
        self.assertEqual(json.loads(re.search(r'id="bundles">(.*?)</script>', page)[1]), [])
        config = json.loads(re.search(r'window\.ClosetLintLocal=(.*?);</script>', page)[1])
        self.assertEqual(config['catalogPhotos'], photos)
        self.assertFalse(config['thumbnails'])
        self.assertEqual(self.store.verification(), before)
        backup = self.root / 'export.zip'; self.store.export(backup)
        with zipfile.ZipFile(backup) as archive:
            self.assertFalse(any('cache/' in name for name in archive.namelist()))

    def test_restore_rebuilds_same_bundle_id_and_deleted_or_corrupt_cache_is_repaired(self):
        photos = self.catalog.refresh([rt.BUNDLE]); old = photos['legacy-photo'].split('/')[-1]
        path = self.catalog.assets[old][1]
        path.write_bytes(b'incomplete')
        self.assertEqual(self.catalog.asset(old)[1], rt.PNG)
        path.unlink()
        self.assertEqual(self.catalog.asset(old)[1], rt.PNG)
        self.restore(rt.PNG + b'new saved bytes')
        self.catalog.invalidate()
        fresh = self.catalog.refresh([rt.BUNDLE])['legacy-photo'].split('/')[-1]
        self.assertNotEqual(old, fresh)
        self.assertIsNone(self.catalog.asset(old))
        self.assertEqual(self.catalog.asset(fresh)[1], rt.PNG + b'new saved bytes')

    def test_unwritable_cache_falls_back_to_bounded_bundle_loader(self):
        with patch.object(self.catalog, 'refresh', side_effect=PermissionError):
            page = render_app(self.store, 'synthetic', catalog=self.catalog)
        self.assertIn(rt.BUNDLE, re.search(r'id="bundles">(.*?)</script>', page)[1])
        config = json.loads(re.search(r'window\.ClosetLintLocal=(.*?);</script>', page)[1])
        self.assertNotIn('catalogPhotos', config)

    def test_legacy_images_use_the_same_preview_worker_without_uploading(self):
        self.catalog.refresh([rt.BUNDLE]); key = self.catalog.ids()[0]
        (self.store.folder / 'photo-tools.json').write_text(json.dumps({'python': sys.executable}))
        cache = ThumbnailCache(self.store, self.catalog)
        preview = b'RIFF\0\0\0\0WEBPsynthetic'
        def generate(args, **kwargs):
            self.assertEqual(Path(args[-2]).read_bytes(), rt.PNG)
            Path(args[-1]).write_bytes(preview)
            return SimpleNamespace(returncode=0)
        before = self.store.verification()
        with patch('thumbnails.subprocess.run', side_effect=generate):
            cache.prepare('catalog-' + key)
        self.assertEqual(cache.get('catalog-' + key, self.catalog.asset(key)), preview)
        self.assertEqual(self.store.verification(), before)

    def test_individual_photo_http_routes_preserve_origin_and_cache_boundaries(self):
        photos = self.catalog.refresh([rt.BUNDLE]); url = photos['legacy-photo']
        rt.RuntimeTests.call(self, 'GET', '/')
        self.server.catalog = self.catalog
        self.assertEqual(rt.RuntimeTests.call(self, 'GET', url), (200, rt.PNG))
        preview = b'RIFF\0\0\0\0WEBPsynthetic'
        self.server.thumbnails = SimpleNamespace(enabled=True, get=lambda key, asset: preview)
        thumb = url.replace('/_catalog/', '/_catalog_thumb/')
        self.assertEqual(rt.RuntimeTests.call(self, 'GET', thumb), (200, preview))
        self.assertEqual(self.response_headers['Cache-Control'], 'private, no-cache')
        for path in (url, thumb):
            self.assertEqual(rt.RuntimeTests.call(self, 'GET', path, headers={'Sec-Fetch-Site': 'cross-site'})[0], 403)

    def test_http_restore_refreshes_catalog_urls_even_when_bundle_id_is_reused(self):
        old = self.catalog.refresh([rt.BUNDLE])['legacy-photo']
        rt.RuntimeTests.call(self, 'GET', '/')
        self.server.catalog = self.catalog
        bundle = json.dumps({'legacy-photo': 'data:image/png;base64,' + base64.b64encode(rt.PNG + b'new bytes').decode()}).encode()
        backup = rt.archive(self.root / 'replacement.zip', assets={rt.PHOTO: rt.PNG, rt.BUNDLE: bundle})
        token = {'X-ClosetLint-Token': 'test-token'}
        status, data = rt.RuntimeTests.call(self, 'POST', '/api/restore/preview', backup.read_bytes(), token)
        self.assertEqual(status, 200)
        body = json.dumps({'ticket': json.loads(data)['ticket'], 'confirm': 'replace-wardrobe'}).encode()
        self.assertEqual(rt.RuntimeTests.call(self, 'POST', '/api/restore/apply', body, token)[0], 200)
        status, page = rt.RuntimeTests.call(self, 'GET', '/')
        self.assertEqual(status, 200)
        config = json.loads(re.search(r'window\.ClosetLintLocal=(.*?);</script>', page.decode())[1])
        self.assertNotEqual(config['catalogPhotos']['legacy-photo'], old)


if __name__ == '__main__':
    unittest.main()
