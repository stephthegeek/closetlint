"""Source staging tests never use the installed wardrobe."""
import json
from pathlib import Path
import unittest
from urllib.parse import urlencode
import test_runtime as rt
from storage import Store
from import_sources import get, upload, update, remove, contents, folder
from piece_import import prepare_batch, import_batch


class ImportSourcesTests(unittest.TestCase):
    setUp = rt.RuntimeTests.setUp
    tearDown = rt.RuntimeTests.tearDown
    call = rt.RuntimeTests.call
    token = {'X-ClosetLint-Token': 'test-token'}

    def args(self, batch='test-batch'):
        return self.store, self.store.state()['instance'], batch

    def url(self, **more):
        return '/api/import/sources?' + urlencode({'instance': self.args()[1], 'batch': 'test-batch', **more})

    def test_upload_resume_choices_and_idempotent_retry(self):
        before = self.store.state()
        first = upload(*self.args(), 'hat', 'My hat.png', rt.PNG)
        self.assertEqual(len(first['files']), 1)
        self.assertEqual(Path(first['files'][0]['path']).read_bytes(), rt.PNG)
        self.assertEqual(self.store.state(), before, 'uploading must not create pieces or wardrobe assets')
        again = upload(*self.args(), 'hat', 'My hat.png', rt.PNG)
        self.assertEqual(len(again['files']), 1)
        with self.assertRaises(ValueError):
            upload(*self.args(), 'hat', 'Other.png', rt.PNG)
        update(*self.args(), {'files': [{'id': 'hat', 'role': 'item', 'isolate': True, 'steering': 'Navy, not black.'}], 'draft': {'method': 'files', 'route': 'direct', 'unexpected': 'ignored'}})
        resumed = get(Store(self.store.folder), self.args()[1], 'test-batch')
        self.assertEqual(resumed['files'][0]['steering'], 'Navy, not black.')
        self.assertTrue(resumed['files'][0]['isolate'])
        self.assertNotIn('unexpected', resumed['draft'])
        self.assertEqual(contents(*self.args(), 'hat'), ('image/png', rt.PNG))
        remove(*self.args(), 'hat')
        self.assertEqual(get(*self.args())['files'], [])
        self.assertFalse(Path(first['files'][0]['path']).exists())

    def test_photo_can_be_imported_from_exact_handoff_path(self):
        upload(*self.args(), 'hat', 'My hat.png', rt.PNG)
        manifest = folder(*self.args()) / 'import.json'
        manifest.write_text(json.dumps({'format': 'closet-lint-import/v1', 'batchId': 'test-batch', 'pieces': [
            {'name': 'Synthetic hat', 'category': 'Tops', 'subcategory': 'Tees', 'status': 'owned',
             'images': [{'file': 'sources/hat.png', 'kind': 'unclassified'}]}]}))
        prepared = prepare_batch(manifest)
        report = import_batch(self.store, *prepared, apply=True, expected_instance=self.args()[1])
        self.assertEqual(report['added'], 1)
        self.assertEqual(report['photosSaved'], 1)
        self.assertTrue(get(*self.args())['completed'])
        retry = import_batch(self.store, *prepared, apply=True, expected_instance=self.args()[1])
        self.assertEqual(retry['added'], 0)
        self.assertEqual(contents(*self.args(), 'hat')[1], rt.PNG)

    def test_auth_identity_types_limits_and_path_protection(self):
        self.assertEqual(self.call('GET', self.url())[0], 403)
        self.assertEqual(self.call('POST', self.url(id='hat', name='hat.png'), rt.PNG)[0], 403)
        code, raw = self.call('POST', self.url(id='hat', name='hat.png'), rt.PNG, self.token)
        self.assertEqual(code, 200, raw)
        code, raw = self.call('GET', self.url(id='hat'), headers=self.token)
        self.assertEqual(code, 200)
        self.assertEqual(raw, rt.PNG)
        for batch in ('../outside', '', 'x/y'):
            with self.assertRaises(ValueError):
                get(self.store, self.args()[1], batch)
        for name, data in [('../hat.png', rt.PNG), ('hat.svg', b'<svg/>'), ('hat.jpg', b'not a photo'), ('hat.pdf', b'no'), ('hat.txt', b'\xff'), ('hat.png', b'x' * (10 * 1024 * 1024 + 1))]:
            with self.assertRaises((ValueError, UnicodeError)):
                upload(*self.args(), 'other', name, data)
        with self.assertRaises(ValueError):
            upload(self.store, 'wrong', 'test-batch', 'hat', 'hat.png', rt.PNG)
        with self.assertRaises(ValueError):
            update(*self.args(), {'files': [{'id': 'hat', 'steering': 'x' * 601}]})
        source = Path(get(*self.args())['files'][0]['path'])
        source.unlink()
        source.symlink_to(self.root / 'secret')
        with self.assertRaises(ValueError):
            contents(*self.args(), 'hat')
        with self.assertRaises(ValueError):
            upload(*self.args(), 'hat', 'hat.png', b'changed')

    def test_reference_documents_and_tampering(self):
        for sid, name, data in [('list', 'list.csv', b'name,size\nhat,L'), ('export', 'export.json', b'{}'), ('pdf', 'order.pdf', b'%PDF-1.4\n')]:
            result = upload(*self.args(), sid, name, data)
            self.assertEqual(result['files'][-1]['role'], 'reference')
        path = Path(get(*self.args())['files'][0]['path'])
        path.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'changed'):
            contents(*self.args(), 'list')
        remove(*self.args(), 'list')
        self.assertEqual(len(get(*self.args())['files']), 2)
