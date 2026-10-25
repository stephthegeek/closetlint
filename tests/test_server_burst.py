"""A normal browser burst queues safely instead of dropping photo connections."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys
import socket
import http.client
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from urllib.request import urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from server import Handler, LocalServer
from storage import Store


class ServerBurstTests(unittest.TestCase):
    def test_twenty_simultaneous_photo_requests_queue_with_eight_active_handlers(self):
        lock = threading.Lock()
        active = peak = 0
        def respond(handler):
            nonlocal active, peak
            with lock:
                active += 1; peak = max(peak, active)
            try:
                time.sleep(0.06)
                handler.send_data(200, b'synthetic photo', 'image/png')
            finally:
                with lock:
                    active -= 1
        with tempfile.TemporaryDirectory() as folder, patch.object(Handler, 'do_GET', respond):
            server = LocalServer(0, Store(Path(folder) / 'synthetic'))
            thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
            url = 'http://127.0.0.1:' + str(server.server_port) + '/synthetic'
            def fetch(_):
                with urlopen(url, timeout=5) as response:
                    return response.status, response.read()
            try:
                with ThreadPoolExecutor(max_workers=20) as pool:
                    results = list(pool.map(fetch, range(20)))
                self.assertEqual(results, [(200, b'synthetic photo')] * 20)
                self.assertGreater(peak, 1)
                self.assertLessEqual(peak, 8)
            finally:
                server.shutdown(); server.server_close(); thread.join(2)


    def test_idle_preconnections_do_not_block_real_requests(self):
        with tempfile.TemporaryDirectory() as folder:
            server = LocalServer(0, Store(Path(folder) / 'synthetic'))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            idle = []
            try:
                idle = [socket.create_connection(('127.0.0.1', server.server_port), timeout=2) for _ in range(8)]
                # Let accepted sockets enter their request-line read.
                deadline = time.monotonic() + 2
                while server.pending._value > 24 and time.monotonic() < deadline:
                    time.sleep(0.01)
                with urlopen('http://127.0.0.1:' + str(server.server_port) + '/runtime.js', timeout=1) as response:
                    self.assertEqual(response.status, 200)
                    self.assertIn(b'ClosetLintRuntime', response.read())
            finally:
                for connection in idle:
                    connection.close()
                server.shutdown(); server.server_close(); thread.join(2)

    def test_http11_reuses_connection_and_errors_close_unread_bodies(self):
        with tempfile.TemporaryDirectory() as folder:
            server = LocalServer(0, Store(Path(folder) / 'synthetic'))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            connection = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=2)
            try:
                connection.request('GET', '/runtime.js')
                response = connection.getresponse()
                self.assertEqual(response.version, 11)
                self.assertEqual(response.status, 200)
                first = response.read()
                original_socket = connection.sock
                self.assertIsNotNone(original_socket)
                connection.request('GET', '/runtime.js')
                response = connection.getresponse()
                self.assertEqual(response.read(), first)
                self.assertIs(connection.sock, original_socket, 'ordinary image bursts can reuse established connections')
                connection.request('PUT', '/api/board', body=b'not read', headers={'X-ClosetLint-Token': 'wrong'})
                response = connection.getresponse()
                self.assertEqual(response.status, 403)
                self.assertEqual(response.getheader('Connection'), 'close')
                response.read()
                self.assertIsNone(connection.sock, 'an unread rejected body cannot become another request')
            finally:
                connection.close()
                server.shutdown(); server.server_close(); thread.join(2)

    def test_expected_connection_resets_are_quiet_but_real_errors_propagate(self):
        handler = Handler.__new__(Handler)
        slot = threading.BoundedSemaphore(1)
        def disconnect():
            slot.acquire()
            handler.active_slot = slot
            raise ConnectionResetError('Browser cancelled')
        with patch('http.server.BaseHTTPRequestHandler.handle_one_request', side_effect=disconnect):
            handler.handle_one_request()
        self.assertTrue(handler.close_connection)
        self.assertTrue(slot.acquire(blocking=False), 'disconnect releases its active request slot')
        with patch('http.server.BaseHTTPRequestHandler.handle_one_request', side_effect=OSError('Storage failed')):
            with self.assertRaisesRegex(OSError, 'Storage failed'):
                handler.handle_one_request()

if __name__ == '__main__':
    unittest.main()
