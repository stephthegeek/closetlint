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
from storage import Store, Archive, encode
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
            server_address=('127.0.0.1', 6684), tickets={}, mutation_lock=threading.RLock())

    def tearDown(self):
        self.temp.cleanup()

    def request(self, path, payload=None, token='test', method='POST'):
        body = encode(payload or {}).encode()
        raw = (method+' '+path+' HTTP/1.0\r\nHost: 127.0.0.1:6684\r\nX-ClosetLint-Token: '+token+'\r\nContent-Length: '+str(len(body))+'\r\n\r\n').encode()+body
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
        mock = SimpleNamespace(new_session=lambda *a,**kw:object(),remove=lambda im,**kw:Image.new('L',im.size,128))
        with patch.dict(sys.modules,{'rembg':mock}),patch.dict('os.environ',{'U2NET_HOME':str(self.root)}),patch.object(sys,'argv',['worker',str(source),str(target)]):
            module.main()
        result = Image.open(target)
        self.assertIsNone(ImageChops.difference(image.convert('RGB'), result.convert('RGB')).getbbox())
        self.assertEqual(result.getchannel('A').getextrema(),(50,50))
        self.assertEqual(Image.open(source).getchannel('A').getextrema(),(100,100))


if __name__ == '__main__':
    unittest.main()
