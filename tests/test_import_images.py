"""Synthetic multi-photo wardrobe backup, without any personal data."""
import base64
import contextlib
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Store, Archive
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=')


class ImportImageTests(unittest.TestCase):
    def test_primary_and_alternate_photos_survive_full_backup(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = Store(root / 'source')
            isolated, model = source.upload(PNG), source.upload(PNG)
            record = {'name': 'Synthetic skirt', 'wish': True, 'photoId': isolated,
                      'photos': [{'photoId': isolated, 'kind': 'isolated'}, {'photoId': model, 'kind': 'model'}],
                      'imageSources': [{'url': 'https://img.example.com/model.jpg', 'kind': 'model'}]}
            source.set_record('custom', 'demo', record)
            record = source.state()['collections']['custom']['demo']
            source.export(root / 'backup.zip')
            restored = Store(root / 'restored')
            with contextlib.closing(Archive(root / 'backup.zip')) as archive:
                restored.restore(archive)
            self.assertEqual(restored.state()['collections']['custom']['demo'], record)
            self.assertEqual(restored.asset(isolated)[1], PNG)
            self.assertEqual(restored.asset(model)[1], PNG)
