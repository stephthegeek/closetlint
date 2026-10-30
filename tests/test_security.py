"""Adversarial requests and backups in disposable synthetic wardrobes."""
import base64
import hashlib
import json
import re
import stat
import struct
import sys
from types import SimpleNamespace
import unittest
import threading
from unittest.mock import patch
import zipfile
import test_runtime as rt
from storage import Archive, decode, encode, media_type, require_safe_pillow, write_version
from server import content_policy, render_app, LocalServer, ThreadingHTTPServer

class SecurityTests(unittest.TestCase):
    setUp = rt.RuntimeTests.setUp
    tearDown = rt.RuntimeTests.tearDown
    call = rt.RuntimeTests.call
    token = {'X-ClosetLint-Token': 'test-token', 'If-Match': '"' + write_version(None) + '"'}

    def test_poisoned_keys_on_record_board_and_restore(self):
        for key in ('__proto__', 'constructor', 'prototype'):
            record = {'name': 'Synthetic', 'nested': {key: {'polluted': True}}}
            self.assertEqual(self.call('PUT','/api/doc/custom/demo',encode(record).encode(),self.token)[0],400)
            self.assertEqual(self.call('PUT','/api/board',encode({'pieces':[],'st':record}).encode(),self.token)[0],400)
            payload = rt.fixture();payload['collections']['custom']['demo'] = record
            with self.assertRaises(ValueError): Archive(rt.archive(self.root/'poison.zip',payload))
        self.assertFalse(self.store.state()['collections']['custom'])
        self.assertIsNone(self.store.state()['board'])
        self.assertEqual(self.call('PUT','/api/doc/custom/__proto__',b'{}',self.token)[0],400)

    def test_wrong_types_and_deep_json_leave_existing_records(self):
        self.store.set_record('custom','keep',{'name':'Keep'});before = self.store.state()
        for record in ({'name':{}},{'neckline':{'bad':True}},{'colors':[42]},{'photos':[None]}):
            self.assertEqual(self.call('PUT','/api/doc/custom/keep',encode(record).encode(),self.token)[0],400)
        self.assertEqual(self.call('PUT','/api/board',b'{"pieces":[42]}',self.token)[0],400)
        self.assertEqual(self.call('PUT','/api/doc/custom/keep',b'{"value":'+b'['*60+b'0'+b']'*60+b'}',self.token)[0],400)
        self.assertEqual(self.store.state(),before)
        for data in ('{"x":NaN}', '{"name":"one","name":"two"}', '['*1500+'0'+']'*1500):
            with self.assertRaises(ValueError): decode(data)
        payload = rt.fixture();payload['formatVersion'] = 999
        with self.assertRaises(ValueError): Archive(rt.archive(self.root/'future.zip',payload))

    def test_raster_bundles_and_dimension_limits(self):
        self.assertEqual(media_type(rt.PNG),'image/png')
        for image in (b'<svg onload="alert(1)"></svg>',b'\x89PNG\r\n\x1a\n',b'\xff\xd8\xfffake'):
            self.assertEqual(self.call('POST','/api/assets',image,self.token)[0],400)
        bomb = bytearray(rt.PNG);bomb[16:24] = struct.pack('>II',30000,30000)
        self.assertEqual(self.call('POST','/api/assets',bytes(bomb),self.token)[0],400)
        for data in (b'{"id":"data:image/svg+xml;base64,PHN2Zy8+"}',b'{"__proto__":"data:image/png;base64,AAAA"}'):
            with self.assertRaises(ValueError): media_type(data)
        bundle = encode({'demo':'data:image/png;base64,'+base64.b64encode(rt.PNG).decode()}).encode()
        self.assertEqual(media_type(bundle),'application/json')
        self.assertEqual(self.store.state()['photos'],0)

    def test_archive_symlinks_and_invalid_board(self):
        path = rt.archive(self.root/'bad.zip')
        with zipfile.ZipFile(path,'a') as z:
            info = zipfile.ZipInfo('photos/'+'c'*32);info.create_system = 3
            info.external_attr = (stat.S_IFLNK|0o777)<<16;z.writestr(info,'/etc/passwd')
        with self.assertRaises(ValueError): Archive(path)
        payload = rt.fixture();payload['board']['pieces'] = [None]
        with self.assertRaises(ValueError): Archive(rt.archive(self.root/'badboard.zip',payload))

    def test_csp_hashes_match_scripts_and_block_arbitrary_handlers(self):
        page = render_app(self.store,'test-token');policy = content_policy(page)
        scripts = policy.split('script-src ')[1].split(';')[0]
        self.assertNotIn("'unsafe-inline'",scripts);self.assertNotIn("'unsafe-eval'",policy)
        for block in re.findall(r'<script\b[^>]*>(.*?)</script\s*>',page,re.S|re.I):
            digest = base64.b64encode(hashlib.sha256(block.encode()).digest()).decode()
            self.assertIn("'sha256-"+digest+"'",scripts)
        self.assertNotIn(base64.b64encode(hashlib.sha256(b'alert(1)').digest()).decode(),scripts)
        self.assertEqual(self.call('GET','/runtime/server.py')[0],404)
        self.assertEqual(self.call('GET','/api/assets',headers=self.token)[0],404)

    def test_preview_eviction_and_bad_confirmation(self):
        tickets = []
        for _ in range(3):
            status,data = self.call('POST','/api/restore/preview',self.backup.read_bytes(),self.token)
            self.assertEqual(status,200);tickets.append(json.loads(data)['ticket'])
        self.assertEqual(len(self.server.tickets),2);self.assertNotIn(tickets[0],self.server.tickets)
        self.assertEqual(len(list((self.store.folder/'staging').glob('*.zip'))),2)
        for endpoint in ('apply','cancel'):
            self.assertEqual(self.call('POST','/api/restore/'+endpoint,b'[]',self.token)[0],400)
        self.assertFalse(self.store.state()['collections']['custom'])

    def test_old_photo_decoder_version_is_blocked(self):
        with patch.dict(sys.modules, {'PIL': SimpleNamespace(__version__='12.3.0')}):
            with self.assertRaisesRegex(ValueError, 'Pillow 13.0.0'): require_safe_pillow()
        with patch.dict(sys.modules, {'PIL': SimpleNamespace(__version__='13.0.0')}): require_safe_pillow()

    def test_ambiguous_lengths(self):
        for headers in ({'Transfer-Encoding':'chunked'},{'Content-Length':'-1'},{'Content-Length':'33554433'}):
            self.assertEqual(self.call('POST','/api/assets',rt.PNG,dict(self.token,**headers))[0],400)

    def test_server_rejects_excess_connections_and_releases_worker_slot(self):
        server = LocalServer.__new__(LocalServer)
        server.slots = threading.BoundedSemaphore(1)
        server.pending = threading.BoundedSemaphore(1)
        connection = rt.Connection(b'')
        with patch.object(ThreadingHTTPServer,'process_request'), patch.object(server,'shutdown_request') as shutdown:
            server.process_request(connection,('127.0.0.1',1))
            server.process_request(connection,('127.0.0.1',2))
            self.assertIn(b'503 Service Unavailable',connection.output)
            shutdown.assert_called_once_with(connection)
        with patch.object(ThreadingHTTPServer,'process_request_thread',side_effect=RuntimeError('worker failed')):
            with self.assertRaises(RuntimeError): server.process_request_thread(connection,('127.0.0.1',1))
        self.assertTrue(server.slots.acquire(blocking=False))

    def test_archive_size_limit_rejects_before_restore(self):
        with patch('storage.MAX_ARCHIVE',10):
            with self.assertRaises(ValueError): Archive(self.backup)

if __name__ == '__main__': unittest.main()
