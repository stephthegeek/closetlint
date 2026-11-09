"""Synthetic photo flow tests; no personal photos or model downloads."""
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Store, Archive, encode, write_version
from server import Handler
from background_removal import remove_background, settings
from test_runtime import Connection, PNG


class BackgroundRemovalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'store')
        self.photo = self.store.upload(PNG)
        self.server = SimpleNamespace(host='127.0.0.1', store=self.store, token='test',
            server_address=('127.0.0.1', 6684), tickets={}, mutation_lock=threading.RLock(), background_slot=threading.BoundedSemaphore(1))

    def tearDown(self):
        self.temp.cleanup()

    def request(self, path, payload=None, token='test', method='POST', headers=None):
        body = encode(payload or {}).encode()
        extra = ''.join(k+': '+v+'\r\n' for k, v in (headers or {}).items())
        raw = (method+' '+path+' HTTP/1.0\r\nHost: 127.0.0.1:6684\r\nX-ClosetLint-Token: '+token+'\r\nContent-Length: '+str(len(body))+'\r\n'+extra+'\r\n').encode()+body
        conn = Connection(raw)
        Handler(conn, ('127.0.0.1', 1), self.server)
        header, response = bytes(conn.output).split(b'\r\n\r\n', 1)
        return int(header.split()[1]), response

    def test_preview_requires_token_and_existing_local_asset(self):
        self.assertEqual(self.request('/api/photos/remove-background', {'photoId':self.photo}, token='wrong')[0], 403)
        self.assertEqual(self.request('/api/photos/remove-background', {'photoId':'https://remote/image.jpg'})[0], 400)
        self.assertEqual(self.request('/api/photos/remove-background', {'photoId':'f'*32})[0], 400)

    def test_optional_setup_and_failed_preview_keep_original_and_records(self):
        self.assertIsNone(settings(self.store.folder))
        self.assertEqual(self.request('/api/photos/background-status', method='GET')[0], 200)
        before = self.store.verification()
        self.assertEqual(self.request('/api/photos/remove-background', {'photoId':self.photo})[0], 400)
        self.assertEqual(self.store.verification(), before)

    def test_successful_preview_returns_png_without_upload_or_record_write(self):
        before = self.store.verification()
        with patch('server.remove_background', return_value=PNG):
            status, body = self.request('/api/photos/remove-background', {'photoId':self.photo})
        self.assertEqual(status, 200)
        self.assertEqual(body, PNG)
        self.assertEqual(self.store.verification(), before)

    def test_inference_allows_board_save_and_rejects_parallel_models(self):
        entered, release, finished = threading.Event(), threading.Event(), threading.Event()
        results, writes = [], []
        def worker(*args):
            entered.set()
            if not release.wait(3):
                raise ValueError('Synthetic worker was not released')
            return PNG
        def save():
            writes.append(self.request('/api/board', {'pieces': []}, method='PUT',
                headers={'If-Match': '"'+write_version(None)+'"'}))
            finished.set()
        with patch('server.remove_background', side_effect=worker) as remove:
            thread = threading.Thread(target=lambda: results.append(self.request(
                '/api/photos/remove-background', {'photoId': self.photo})))
            thread.start()
            writer = None
            try:
                self.assertTrue(entered.wait(2))
                writer = threading.Thread(target=save)
                writer.start()
                self.assertTrue(finished.wait(1), 'board save must finish while inference is paused')
                self.assertEqual(writes[0][0], 200)
                busy = self.request('/api/photos/remove-background', {'photoId': self.photo})
                self.assertEqual(busy[0], 429)
                self.assertEqual(remove.call_count, 1, 'a busy server never starts a second model')
            finally:
                release.set()
                thread.join(3)
                if writer:
                    writer.join(3)
            self.assertEqual(results[0], (200, PNG))
            self.assertEqual(self.request('/api/photos/remove-background', {'photoId': self.photo})[0], 200)

    def test_failed_inference_releases_capacity(self):
        with patch('server.remove_background', side_effect=[ValueError('Synthetic failure'), PNG]):
            self.assertEqual(self.request('/api/photos/remove-background', {'photoId': self.photo})[0], 400)
            self.assertEqual(self.request('/api/photos/remove-background', {'photoId': self.photo})[0], 200)

    def test_source_ownership_model_and_restored_bytes_are_rechecked(self):
        for change in ('ownership', 'model', 'bytes'):
            self.store.set_record('custom', 'subject', {'name': 'Subject', 'meta': 'Tops', 'photoId': self.photo})
            def worker(*args):
                if change == 'ownership':
                    self.store.set_record('custom', 'subject', {'name': 'Subject', 'meta': 'Tops'})
                elif change == 'model':
                    self.store.set_record('custom', 'subject', {'name': 'Subject', 'meta': 'Jewelry', 'photoId': self.photo})
                else:
                    with self.store.connect() as db:
                        db.execute('UPDATE assets SET data=? WHERE id=?', (PNG+b'new source', self.photo))
                return PNG
            with self.subTest(change=change), patch('server.remove_background', side_effect=worker):
                status, body = self.request('/api/photos/remove-background',
                    {'photoId': self.photo, 'pieceId': 'c-subject'})
                self.assertEqual(status, 400, 'a changed source cannot return a stale preview')
                self.assertNotEqual(body, PNG)

    def test_preview_response_does_not_hold_write_or_inference_lock(self):
        original = Handler.send_data
        checked = []
        def respond(handler, status, data, *args, **kwargs):
            if handler.path == '/api/photos/remove-background' and status == 200:
                acquired = []
                def check():
                    with self.server.mutation_lock:
                        acquired.append(self.server.background_slot.acquire(blocking=False))
                        if acquired[-1]:
                            self.server.background_slot.release()
                thread = threading.Thread(target=check)
                thread.start(); thread.join(1)
                checked.extend(acquired)
            return original(handler, status, data, *args, **kwargs)
        with patch.object(Handler, 'send_data', respond), patch('server.remove_background', return_value=PNG):
            self.assertEqual(self.request('/api/photos/remove-background', {'photoId': self.photo})[0], 200)
        self.assertEqual(checked, [True], 'slow response transmission must hold neither lock')

    def test_private_model_override_requires_flag_and_never_saves(self):
        self.store.set_record('custom', 'tee', {'name': 'Tee', 'meta': 'Tops', 'photoId': self.photo})
        payload = {'photoId': self.photo, 'pieceId': 'c-tee', 'model': 'isnet-general-use'}
        with patch('server.remove_background', return_value=PNG) as remove:
            self.assertEqual(self.request('/api/photos/remove-background', payload)[0], 400)
            remove.assert_not_called()
        config = self.store.folder / 'experimental.json'
        for value in ['{', '[]', '{"alternateBackgroundModel":"true"}']:
            config.write_text(value)
            self.assertEqual(self.request('/api/photos/remove-background', payload)[0], 400)
        config.write_text('{"alternateBackgroundModel":true}')
        before = self.store.verification()
        with patch('server.remove_background', return_value=PNG) as remove:
            self.assertEqual(self.request('/api/photos/remove-background', payload)[0], 200)
            self.assertEqual(remove.call_args.args[2], 'isnet-general-use')
            self.assertEqual(self.request('/api/photos/remove-background', {**payload, 'model':'u2net'})[0], 200)
            self.assertEqual(remove.call_args.args[2], 'u2net')
            self.assertEqual(self.request('/api/photos/remove-background', {**payload, 'model':'unknown'})[0], 400)
            self.assertEqual(self.request('/api/photos/remove-background', {**payload, 'pieceId':None})[0], 400)
            self.assertEqual(self.request('/api/photos/remove-background', {**payload, 'pieceId':'c-missing'})[0], 400)
        self.assertEqual(self.store.verification(), before)
        status, body = self.request('/api/photos/background-status', method='GET')
        self.assertTrue(json.loads(body)['alternateModel'])

    def test_routes_by_saved_category_and_retains_original(self):
        self.store.set_record('custom', 'ring', {'name': 'Ring', 'meta': 'Jewelry', 'photoId': self.photo})
        self.store.set_record('custom', 'tee', {'name': 'Tee', 'meta': 'Tops', 'photoId': self.photo})
        self.store.set_record('custom', 'glasses', {'name': 'Glasses', 'meta': 'Glasses', 'photoId': self.photo})
        self.store.set_record('custom', 'eyewear', {'name': 'Eyewear', 'meta': 'Eyewear', 'photoId': self.photo})
        before = self.store.verification()
        for piece_id, model in [('c-ring', 'isnet-general-use'), ('c-glasses', 'isnet-general-use'), ('c-eyewear', 'isnet-general-use'), ('c-tee', 'u2net')]:
            with self.subTest(piece_id=piece_id), patch('server.remove_background', return_value=PNG) as remove:
                status, body = self.request('/api/photos/remove-background', {'photoId': self.photo, 'pieceId': piece_id})
                self.assertEqual(status, 200)
                self.assertEqual(body, PNG)
                self.assertEqual(remove.call_args.args[2], model)
        self.assertEqual(self.store.verification(), before)
        self.store.set_record('edits', 'c-tee', {'meta': 'Jewelry'})
        with patch('server.remove_background', return_value=PNG) as remove:
            self.assertEqual(self.request('/api/photos/remove-background', {'photoId': self.photo, 'pieceId': 'c-tee'})[0], 200)
            self.assertEqual(remove.call_args.args[2], 'isnet-general-use')

    def test_rejects_unrelated_missing_and_care_label_pieces_before_worker(self):
        self.store.set_record('custom', 'unrelated', {'name': 'Other', 'meta': 'Jewelry'})
        self.store.set_record('custom', 'label', {'name': 'Label', 'meta': 'Jewelry', 'photoId': self.photo,
            'photos': [{'photoId': self.photo, 'kind': 'carelabel'}]})
        for piece_id in ['c-unrelated', 'c-missing', 'c-label', [], '']:
            with self.subTest(piece_id=piece_id), patch('server.remove_background') as remove:
                self.assertEqual(self.request('/api/photos/remove-background', {'photoId': self.photo, 'pieceId': piece_id})[0], 400)
                remove.assert_not_called()

    def test_missing_jewelry_model_does_not_fallback_or_download(self):
        models = self.root / 'models'; models.mkdir(); (models / 'u2net.onnx').touch()
        (self.store.folder / 'background-removal.json').write_text(json.dumps({'python': sys.executable, 'models': str(models)}))
        self.assertIsNotNone(settings(self.store.folder))
        with patch('background_removal.subprocess.run') as run:
            with self.assertRaisesRegex(ValueError, 'Jewelry and eyewear background removal needs its model'):
                remove_background(self.store.folder, PNG, 'isnet-general-use')
            run.assert_not_called()

    def test_timeout_and_failed_worker_preserve_input(self):
        import subprocess
        config = {'python': sys.executable, 'models': str(self.root)}
        for failure in [subprocess.TimeoutExpired('worker', 120), OSError('cannot start')]:
            with patch('background_removal.settings', return_value=config), patch('background_removal.subprocess.run', side_effect=failure):
                with self.assertRaisesRegex(ValueError, 'original is unchanged'):
                    remove_background(self.store.folder, PNG, 'isnet-general-use')
        self.assertEqual(self.store.asset(self.photo)[1], PNG)

    def test_inference_normalization_for_each_model_and_constant_mask(self):
        import numpy as np
        from PIL import Image
        from background_worker import infer_mask
        for model, size, expected in [('u2net', 320, (1 - .485) / .229), ('isnet-general-use', 1024, .5)]:
            captured = []
            def run(_, inputs):
                captured.append(inputs['input'])
                return [np.ones((1, 1, 2, 2), dtype=np.float32)]
            session = SimpleNamespace(get_inputs=lambda: [SimpleNamespace(name='input')], run=run)
            mask = infer_mask(Image.new('RGB', (5, 3), 'white'), session, model)
            self.assertEqual(captured[0].shape, (1, 3, size, size))
            self.assertAlmostEqual(float(captured[0][0, 0, 0, 0]), expected, places=5)
            self.assertEqual(mask.size, (5, 3))
            self.assertEqual(mask.getextrema(), (0, 0))

    def test_isnet_checksum_and_unknown_model_are_rejected(self):
        from background_worker import prepare, model_path
        path = model_path(self.root, 'isnet-general-use')
        path.parent.mkdir(parents=True); path.write_bytes(b'wrong weights')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            prepare(self.root, 'isnet-general-use')
        with self.assertRaisesRegex(ValueError, 'Unknown'):
            model_path(self.root, '../../unexpected')

    def test_cutout_and_original_relationship_survives_backup(self):
        derived = self.store.upload(PNG)
        photos = [{'photoId':self.photo,'kind':'model'}, {'photoId':derived,'kind':'model','cutout':True,'sourcePhotoId':self.photo,'processing':'rembg-u2net-mask'}]
        self.store.set_record('custom','synthetic',{'name':'Synthetic tee','photoId':derived,'photos':photos})
        backup = self.root / 'test.zip'
        self.store.export(backup)
        other = Store(self.root / 'restored')
        with contextlib.closing(Archive(backup)) as a:
            other.restore(a)
        self.assertEqual(other.state()['collections']['custom']['synthetic']['photos'],photos)
        self.assertEqual(other.asset(self.photo)[1],PNG)
        self.assertEqual(other.asset(derived)[1],PNG)

    def test_worker_changes_alpha_only_and_preserves_existing_transparency(self):
        try:
            from PIL import Image, ImageChops
        except ImportError:
            self.skipTest('Optional Pillow unavailable')
        import importlib.util
        source = self.root / 'source.png'; target = self.root / 'out.png'
        image = Image.new('RGBA',(3,2),(240,220,200,100));image.save(source)
        model = self.root / 'models/u2net/u2net.onnx';model.parent.mkdir(parents=True);model.touch()
        spec = importlib.util.spec_from_file_location('worker_under_test',Path(__file__).resolve().parents[1]/'runtime/background_worker.py')
        module = importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        mock = SimpleNamespace(disable_telemetry_events=lambda:None,
            SessionOptions=lambda:SimpleNamespace(), InferenceSession=lambda *a,**kw:object())
        with patch.dict(sys.modules,{'onnxruntime':mock}),patch.object(module,'verify_model'), \
                patch.object(module,'infer_mask',side_effect=lambda im,session,model:Image.new('L',im.size,128)), \
                patch.dict('os.environ',{'U2NET_HOME':str(self.root)}),patch.object(sys,'argv',['worker',str(source),str(target)]):
            module.main()
        result = Image.open(target)
        self.assertIsNone(ImageChops.difference(image.convert('RGB'), result.convert('RGB')).getbbox())
        self.assertEqual(result.getchannel('A').getextrema(),(50,50))
        self.assertEqual(Image.open(source).getchannel('A').getextrema(),(100,100))

    def test_setup_refuses_wrong_model_checksum(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('worker_checksum',Path(__file__).resolve().parents[1]/'runtime/background_worker.py')
        module = importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        model = self.root/'u2net.onnx';model.write_bytes(b'not a model')
        with self.assertRaisesRegex(ValueError,'checksum'):
            module.prepare(self.root)
        self.assertEqual(model.read_bytes(),b'not a model')

    def test_bad_model_download_is_not_installed(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('worker_download',Path(__file__).resolve().parents[1]/'runtime/background_worker.py')
        module = importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with patch.object(module,'urlopen',return_value=io.BytesIO(b'bad model')):
            with self.assertRaisesRegex(ValueError,'checksum'):
                module.prepare(self.root)
        self.assertFalse((self.root/'models/u2net/u2net.onnx').exists())
        self.assertFalse((self.root/'models/u2net/u2net.download').exists())


if __name__ == '__main__':
    unittest.main()
