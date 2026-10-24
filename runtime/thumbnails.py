"""Disposable preview cache. Native image libraries stay in the optional worker."""
from collections import deque
import hashlib
from pathlib import Path
import subprocess
import tempfile
import threading

from photo_environment import environment

WORKER = Path(__file__).with_name('thumbnail_worker.py')


class ThumbnailCache:
    def __init__(self, store, catalog=None):
        self.store = store
        self.catalog = catalog
        self.config = environment(store.folder)
        self.enabled = self.config is not None
        self.folder = store.folder / 'cache' / 'thumbnails-v1'
        self.pending = deque()
        self.queued = set()
        self.failed = set()
        self.lock = threading.Lock()
        self.stopped = threading.Event()

    def path(self, asset_id, data):
        return self.folder / (asset_id + '-' + hashlib.sha256(data).hexdigest() + '.webp')

    def get(self, asset_id, asset):
        if not self.enabled or not asset[0].startswith('image/'):
            return None
        try:
            path = self.path(asset_id, asset[1])
            with path.open('rb') as source:
                data = source.read(4 * 1024 * 1024 + 1)
            if len(data) <= 4 * 1024 * 1024 and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
                return data if len(data) < len(asset[1]) else None
            path.unlink()  # Rebuild an incomplete/corrupt disposable cache entry.
        except OSError:
            pass
        with self.lock:
            if len(self.pending) < 64 and asset_id not in self.queued:
                self.pending.append(asset_id)
                self.queued.add(asset_id)
        return None

    def prepare(self, asset_id):
        asset = self.catalog.asset(asset_id[8:]) if asset_id.startswith('catalog-') and self.catalog else self.store.asset(asset_id)
        if not asset or not asset[0].startswith('image/'):
            return
        target = self.path(asset_id, asset[1])
        if target.is_file() or target.name in self.failed:
            return
        self.folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        with tempfile.TemporaryDirectory(prefix='building-', dir=self.folder) as tmp:
            source, output = Path(tmp) / 'source', Path(tmp) / 'preview.webp'
            source.write_bytes(asset[1])
            try:
                result = subprocess.run([self.config['python'], str(WORKER), str(source), str(output)],
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
                if result.returncode == 3:
                    self.enabled = False  # Photo setup needs attention; serve originals.
                    return
                if result.returncode or not output.is_file():
                    raise ValueError('Preview could not be generated')
                data = output.read_bytes()
                if len(data) > 4 * 1024 * 1024 or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
                    raise ValueError('Invalid preview')
                output.chmod(0o600)
                output.replace(target)
            except (OSError, ValueError, subprocess.TimeoutExpired):
                self.failed.add(target.name)

    def start(self):
        if self.enabled:
            threading.Thread(target=self.run, name='closetlint-thumbnails', daemon=True).start()

    def run(self):
        try:
            with self.store.connect() as db:
                catalog_ids = ['catalog-' + key for key in self.catalog.ids()] if self.catalog else []
                warm = iter(catalog_ids + [row[0] for row in db.execute("SELECT id FROM assets WHERE mime LIKE 'image/%'")])
            while not self.stopped.is_set() and self.enabled:
                with self.lock:
                    asset_id = self.pending.popleft() if self.pending else next(warm, None)
                if asset_id is None:
                    self.stopped.wait(0.2)
                    continue
                try:
                    self.prepare(asset_id)
                except (OSError, ValueError):
                    # A read-only/full cache must never prevent wardrobe browsing.
                    self.enabled = False
                finally:
                    with self.lock:
                        self.queued.discard(asset_id)
                self.stopped.wait(0.02)
        except Exception:
            self.enabled = False

    def close(self):
        self.stopped.set()
