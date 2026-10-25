"""Read legacy photo bundles into a disposable, individually served image cache."""
import base64
import hashlib
import os
import re
import tempfile
import threading

from storage import MAX_ASSET, decode, media_type


class CatalogPhotos:
    def __init__(self, store):
        self.store = store
        self.folder = store.folder / 'cache' / 'catalog-photos-v1'
        self.lock = threading.RLock()
        self.bundle_ids = None
        self.photos = {}
        self.assets = {}

    def invalidate(self):
        with self.lock:
            self.bundle_ids = None
            self.photos = {}
            self.assets = {}

    def refresh(self, bundle_ids):
        with self.lock:
            if self.bundle_ids == tuple(bundle_ids):
                return dict(self.photos)
            photos, assets = {}, {}
            for bundle_id in bundle_ids:
                bundle = self.store.asset(bundle_id)
                if not bundle or bundle[0] != 'application/json':
                    raise ValueError('Catalog photo bundle is unavailable')
                values = decode(bundle[1])
                if not isinstance(values, dict):
                    raise ValueError('Invalid catalog photo bundle')
                for key, value in values.items():
                    if not isinstance(value, str):
                        raise ValueError('Invalid catalog photo')
                    match = re.fullmatch(r'data:(image/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=\s]+)', value)
                    if not match:
                        raise ValueError('Invalid catalog photo')
                    data = base64.b64decode(re.sub(r'\s', '', match[2]), validate=True)
                    if len(data) > MAX_ASSET or media_type(data) != match[1]:
                        raise ValueError('Invalid catalog photo')
                    digest = hashlib.sha256(data).hexdigest()
                    asset_id = digest[:32]
                    target = self.folder / (digest + '.photo')
                    if not target.is_file():
                        self.folder.mkdir(parents=True, exist_ok=True, mode=0o700)
                        fd, temporary = tempfile.mkstemp(dir=self.folder)
                        try:
                            with os.fdopen(fd, 'wb') as output:
                                output.write(data)
                            os.replace(temporary, target)
                        finally:
                            if os.path.exists(temporary):
                                os.unlink(temporary)
                    photos[key] = '/_catalog/' + asset_id
                    assets[asset_id] = (match[1], target)
            self.photos, self.assets = photos, assets
            self.bundle_ids = tuple(bundle_ids)
            return dict(photos)

    def asset(self, asset_id):
        with self.lock:
            entry = self.assets.get(asset_id)
            if not entry:
                return None
            try:
                data = entry[1].read_bytes()
                if hashlib.sha256(data).hexdigest() != entry[1].stem:
                    entry[1].unlink()
                    raise OSError('Cached photo needs rebuilding')
                return entry[0], data
            except OSError:
                # Rebuild a disposable cache deleted while the server was running.
                bundles = self.bundle_ids
                self.bundle_ids = None
                self.refresh(bundles or [])
                entry = self.assets.get(asset_id)
                return (entry[0], entry[1].read_bytes()) if entry else None

    def ids(self):
        with self.lock:
            return list(self.assets)
