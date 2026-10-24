"""Synthetic photo previews: no personal wardrobe or optional native imports in core."""
import base64
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Store
from thumbnails import ThumbnailCache

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=')
WEBP = b'RIFF' + b'\0' * 4 + b'WEBP' + b'synthetic'


class ThumbnailTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.temp.name) / 'synthetic')
        self.asset_id = self.store.upload(PNG)

    def tearDown(self):
        self.temp.cleanup()

    def cache(self):
        (self.store.folder / 'photo-tools.json').write_text(json.dumps({'python': sys.executable}))
        return ThumbnailCache(self.store)

    def test_core_without_photo_setup_falls_back_without_creating_cache(self):
        cache = ThumbnailCache(self.store)
        self.assertFalse(cache.enabled)
        self.assertIsNone(cache.get(self.asset_id, self.store.asset(self.asset_id)))
        self.assertFalse(cache.folder.exists())

    def test_cache_miss_is_nonblocking_deduplicated_and_bounded(self):
        cache = self.cache()
        with patch('thumbnails.subprocess.run') as run:
            for _ in range(70):
                self.assertIsNone(cache.get(self.asset_id, ('image/png', PNG)))
            self.assertEqual(len(cache.pending), 1)
            for i in range(100):
                cache.get(format(i, '032x'), ('image/png', PNG))
            self.assertEqual(len(cache.pending), 64)
            run.assert_not_called()

    def test_atomic_preview_cache_and_changed_source_never_reuse_wrong_image(self):
        cache = self.cache()
        def generate(args, **kwargs):
            Path(args[-1]).write_bytes(WEBP)
            return SimpleNamespace(returncode=0)
        before = self.store.verification()
        with patch('thumbnails.subprocess.run', side_effect=generate) as run:
            cache.prepare(self.asset_id)
            self.assertEqual(cache.get(self.asset_id, ('image/png', PNG)), WEBP)
            cache.prepare(self.asset_id)
            self.assertEqual(run.call_count, 1, 'existing previews survive server restarts')
        self.assertEqual(self.store.verification(), before, 'cache generation never writes wardrobe records or original assets')
        self.assertIsNone(cache.get(self.asset_id, ('image/png', PNG + b'changed after restore')))
        cache.path(self.asset_id, PNG).write_bytes(b'incomplete')
        self.assertIsNone(cache.get(self.asset_id, ('image/png', PNG)))
        self.assertFalse(cache.path(self.asset_id, PNG).exists(), 'corrupt previews can be rebuilt')

    def test_cold_request_can_receive_a_ready_preview_without_original_download(self):
        cache = self.cache()
        cache.running = True
        def complete():
            cache.folder.mkdir(parents=True, exist_ok=True)
            cache.path(self.asset_id, PNG).write_bytes(WEBP)
            with cache.ready:
                cache.ready.notify_all()
        timer = threading.Timer(0.02, complete)
        timer.start()
        try:
            self.assertEqual(cache.wait_for(self.asset_id, ('image/png', PNG)), WEBP)
            self.assertEqual(self.store.asset(self.asset_id)[1], PNG)
        finally:
            timer.join()
            cache.close()

    def test_cold_wait_is_bounded_and_unhelpful_previews_never_delay_originals(self):
        cache = self.cache()
        cache.running = True
        started = time.monotonic()
        self.assertIsNone(cache.wait_for(self.asset_id, ('image/png', PNG), timeout=0.03))
        self.assertLess(time.monotonic() - started, 0.5, 'stalled encoding cannot hold the request indefinitely')
        cache.folder.mkdir(parents=True, exist_ok=True)
        cache.path(self.asset_id, PNG).write_bytes(WEBP + b'x' * len(PNG))
        with patch.object(cache.ready, 'wait', side_effect=AssertionError('should not wait')):
            self.assertIsNone(cache.wait_for(self.asset_id, ('image/png', PNG)))
            self.assertIsNone(cache.wait_for(self.asset_id, ('application/json', b'{}')))
        cache.close()

    def test_failed_or_missing_codec_and_timeout_keep_original_available(self):
        for result in (SimpleNamespace(returncode=3), SimpleNamespace(returncode=1)):
            cache = self.cache()
            with patch('thumbnails.subprocess.run', return_value=result):
                cache.prepare(self.asset_id)
            self.assertIsNone(cache.get(self.asset_id, ('image/png', PNG)))
            self.assertEqual(self.store.asset(self.asset_id)[1], PNG)
        cache = self.cache()
        with patch('thumbnails.subprocess.run', side_effect=subprocess.TimeoutExpired('worker', 20)):
            cache.prepare(self.asset_id)
        self.assertEqual(self.store.asset(self.asset_id)[1], PNG)
        self.assertFalse(list(cache.folder.glob('building-*')))

    def test_background_warmup_prioritizes_requested_photos_and_can_stop(self):
        cache = self.cache()
        requested = self.store.upload(PNG)
        cache.get(requested, ('image/png', PNG))
        seen, finished = [], threading.Event()
        def prepare(asset_id):
            seen.append(asset_id)
            cache.close()
            finished.set()
        cache.prepare = prepare
        cache.start()
        self.assertTrue(finished.wait(2), 'background work should start without blocking requests')
        self.assertEqual(seen, [requested])

    def test_uploads_arriving_after_start_are_warmed_without_a_browser_request(self):
        cache = self.cache()
        first, later = threading.Event(), threading.Event()
        prepared = []
        def prepare(asset_id):
            prepared.append(asset_id)
            if asset_id == self.asset_id:
                first.set()
            else:
                later.set()
        cache.prepare = prepare
        with patch('thumbnails.SCAN_INTERVAL', 0.03):
            cache.start()
            try:
                self.assertTrue(first.wait(2))
                new_id = self.store.upload(PNG)
                self.assertTrue(later.wait(2), 'a CLI/direct upload must warm without get() or a restart')
                self.assertIn(new_id, prepared)
            finally:
                cache.close()

    def test_upload_queue_and_restore_rescan_do_not_read_or_change_originals(self):
        cache = self.cache()
        with patch.object(self.store, 'asset', side_effect=AssertionError('enqueue must not load full photos')):
            cache.enqueue(self.asset_id)
            cache.enqueue(self.asset_id)
        self.assertEqual(list(cache.pending), [self.asset_id])
        self.assertEqual(self.store.asset(self.asset_id)[1], PNG)
        cache.refresh()
        self.assertTrue(cache.rescan.is_set())
        cache.close()

    def test_real_worker_bounds_dimensions_preserves_alpha_and_drops_metadata(self):
        try:
            from storage import require_safe_pillow
            require_safe_pillow()
            from PIL import Image, PngImagePlugin, features
            if not features.check('webp'):
                self.skipTest('Optional Pillow WebP codec is unavailable')
        except (ImportError, ValueError):
            self.skipTest('Run with the supported optional photo Python for real encoder checks')
        image = Image.new('RGBA', (1200, 600), (60, 120, 150, 0))
        image.paste((180, 80, 40, 255), (100, 100, 1100, 500))
        info = PngImagePlugin.PngInfo(); info.add_text('private', 'Synthetic metadata must not survive')
        source = io.BytesIO(); image.save(source, 'PNG', pnginfo=info)
        asset_id = self.store.upload(source.getvalue()); cache = self.cache()
        cache.prepare(asset_id)
        with Image.open(cache.path(asset_id, source.getvalue())) as preview:
            self.assertEqual(preview.size, (640, 320))
            self.assertEqual(preview.getpixel((0, 0))[3], 0)
            self.assertEqual(preview.getpixel((320, 160))[3], 255)
            self.assertNotIn('private', preview.info)
            self.assertNotIn('exif', preview.info)
        self.assertEqual(self.store.asset(asset_id)[1], source.getvalue())


if __name__ == '__main__':
    unittest.main()
