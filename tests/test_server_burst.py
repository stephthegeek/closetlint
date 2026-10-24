"""A normal browser burst queues safely instead of dropping photo connections."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys
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


if __name__ == '__main__':
    unittest.main()
