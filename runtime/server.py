#!/usr/bin/env python3
"""Run the single-user local app; never exposes the data folder as a web root."""
import argparse
import base64
import hashlib
import ipaddress
import contextlib
import json
import os
from pathlib import Path
import re
import secrets
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
import zipfile

from storage import Archive, Folder, MAX_ARCHIVE, Store, encode, decode
from background_removal import settings as background_settings, remove_background

ROOT = Path(__file__).resolve().parents[1]


def safe_json(value):
    return encode(value).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')


def content_policy(page=None):
    # Authorize only the exact inline blocks we serve, not imported event handlers.
    hashes = []
    if page is not None:
        for script in re.findall(r'<script\b[^>]*>(.*?)</script\s*>', page, re.S | re.I):
            hashes.append("'sha256-" + base64.b64encode(hashlib.sha256(script.encode()).digest()).decode() + "'")
    return "default-src 'self'; script-src 'self' " + ' '.join(hashes) + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"


def render_app(store, token):
    state = store.state()
    html = (ROOT / 'app/closet-lint.html').read_text()
    for key in ('catalog', 'tags', 'bundles', 'pubdata'):
        value = state['base'].get(key, {}) if key != 'pubdata' else {}
        pattern = r'(<script\b[^>]*\bid="' + key + r'"[^>]*>).*?(</script>)'
        html, count = re.subn(pattern, lambda m: m[1] + safe_json(value) + m[2], html, count=1, flags=re.S)
        if count != 1:
            raise ValueError('App is missing its data boundary')
    config = {'token': token, 'board': state['board'], 'instance': state['instance'], 'demo': state['collections']['profile'].get('demo', {}).get('synthetic') is True}
    return html.replace('</head>', '<script>window.ClosetLintLocal=' + safe_json(config) + ';</script><script src="/runtime.js"></script></head>')


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, port, store, host="127.0.0.1"):
        self.host = host
        self.store = store
        self.token = secrets.token_urlsafe(32)
        self.tickets = {}
        self.mutation_lock = threading.RLock()
        self.slots = threading.BoundedSemaphore(8)
        super().__init__((host, port), Handler)

    def get_request(self):
        connection, address = super().get_request()
        connection.settimeout(30)
        return connection, address

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            try:
                request.sendall(b'HTTP/1.0 503 Service Unavailable\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
            finally:
                self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()


class Handler(BaseHTTPRequestHandler):
    server_version = 'ClosetLintLocal/1'

    def log_message(self, fmt, *args):
        # Do not print URLs, record IDs, bodies or personal data.
        pass

    def send_data(self, status, data, mime='application/json', extra=None):
        if isinstance(data, (dict, list)):
            data = encode(data).encode()
        elif isinstance(data, str):
            data = data.encode()
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('Referrer-Policy', 'no-referrer')
        page = data.decode('utf-8') if mime.startswith('text/html') else None
        self.send_header('Content-Security-Policy', content_policy(page))
        if extra:
            for key, value in extra.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def allowed(self, *, token=False):
        port = self.server.server_address[1]
        host = self.headers.get('Host', '')
        if host not in (f'localhost:{port}', f'127.0.0.1:{port}', f'{self.server.host}:{port}'):
            return False
        origin = self.headers.get('Origin')
        if origin is not None and origin != 'http://' + host:
            return False
        if self.headers.get('Sec-Fetch-Site') not in (None, 'same-origin', 'none'):
            return False
        return not token or secrets.compare_digest(self.headers.get('X-ClosetLint-Token', ''), self.server.token)

    def body_length(self, limit):
        if self.headers.get('Transfer-Encoding') is not None or len(self.headers.get_all('Content-Length', [])) != 1:
            raise ValueError('Use one explicit upload length')
        try:
            size = int(self.headers.get('Content-Length', '-1'))
        except ValueError:
            raise ValueError('Invalid upload length')
        if not 0 <= size <= limit:
            raise ValueError('Upload is too large or has no length')
        return size

    def body(self, limit):
        size = self.body_length(limit)
        data = self.rfile.read(size)
        if len(data) != size:
            raise ValueError('Incomplete upload')
        return data

    def do_GET(self):
        path = urlsplit(self.path).path
        if not self.allowed(token=path.startswith('/api/')):
            self.send_data(403, {'error': 'This local app only accepts its own browser requests.'})
            return
        try:
            if path == '/':
                self.send_data(200, render_app(self.server.store, self.server.token), 'text/html; charset=utf-8')
            elif path == '/runtime.js':
                self.send_data(200, (ROOT / 'runtime/browser.js').read_bytes(), 'text/javascript; charset=utf-8')
            elif path == '/api/photos/background-status':
                self.send_data(200, {'available': background_settings(self.server.store.folder) is not None})
            elif path == '/api/state':
                state = self.server.store.state()
                state.pop('base')
                self.send_data(200, state)
            elif path == '/api/backup':
                with tempfile.TemporaryFile() as target:
                    with self.server.mutation_lock:
                        self.server.store.export(target)
                    target.seek(0)
                    self.send_data(200, target.read(), 'application/zip', {'Content-Disposition': 'attachment; filename="closetlint-full-backup.zip"'})
            elif path.startswith('/_blob/'):
                asset = self.server.store.asset(path.removeprefix('/_blob/'))
                if asset is None:
                    self.send_data(404, {'error': 'Photo not found'})
                else:
                    self.send_data(200, asset[1], asset[0])
            else:
                self.send_data(404, {'error': 'Not found'})
        except (ValueError, KeyError, zipfile.BadZipFile):
            self.send_data(400, {'error': 'The stored wardrobe or backup could not be read.'})
        except Exception:
            self.send_data(500, {'error': 'The local storage operation failed. Your data folder has not been published.'})

    def do_POST(self):
        self.mutate('POST')

    def do_PUT(self):
        self.mutate('PUT')

    def do_DELETE(self):
        self.mutate('DELETE')

    def mutate(self, method):
        if not self.allowed(token=True):
            self.send_data(403, {'error': 'This local app only accepts its own browser requests.'})
            return
        path = urlsplit(self.path).path
        try:
            with self.server.mutation_lock:
                self.expire_tickets()
                match = re.fullmatch(r'/api/doc/([^/]+)/([^/]+)', path)
                if match and method in ('PUT', 'DELETE'):
                    col, record_id = map(unquote, match.groups())
                    if method == 'PUT':
                        self.server.store.set_record(col, record_id, decode(self.body(2 * 1024 * 1024)))
                    else:
                        self.server.store.delete_record(col, record_id)
                    self.send_data(200, {'ok': True})
                elif path == '/api/board' and method == 'PUT':
                    self.server.store.set_board(decode(self.body(4 * 1024 * 1024)))
                    self.send_data(200, {'ok': True})
                elif path == '/api/assets' and method == 'POST':
                    self.send_data(200, {'id': self.server.store.upload(self.body(32 * 1024 * 1024))})
                elif path == '/api/photos/remove-background' and method == 'POST':
                    data = decode(self.body(4096))
                    if not isinstance(data, dict):
                        raise ValueError('Choose a saved photo first.')
                    photo_id = data.get('photoId')
                    if not isinstance(photo_id, str):
                        raise ValueError('Choose a saved photo first.')
                    asset = self.server.store.asset(photo_id)
                    if not asset or not asset[0].startswith('image/'):
                        raise ValueError('Photo not found. Your original is unchanged.')
                    self.send_data(200, remove_background(self.server.store.folder, asset[1]), 'image/png')
                elif path == '/api/restore/preview' and method == 'POST':
                    # Two previews maximum; discard the oldest before accepting another.
                    while len(self.server.tickets) >= 2:
                        oldest = min(self.server.tickets, key=lambda k: self.server.tickets[k][1])
                        self.server.tickets.pop(oldest)[0].unlink(missing_ok=True)
                    stage = self.server.store.folder / 'staging'
                    stage.mkdir(exist_ok=True, mode=0o700)
                    fd, filename = tempfile.mkstemp(dir=stage, suffix='.zip')
                    try:
                        with os.fdopen(fd, 'wb') as target:
                            remaining = self.body_length(MAX_ARCHIVE)
                            while remaining:
                                chunk = self.rfile.read(min(1024 * 1024, remaining))
                                if not chunk:
                                    raise ValueError('Incomplete upload')
                                target.write(chunk)
                                remaining -= len(chunk)
                        with contextlib.closing(Archive(filename)) as archive:
                            summary = archive.summary
                        ticket = secrets.token_urlsafe(24)
                        self.server.tickets[ticket] = (Path(filename), time.monotonic())
                        self.send_data(200, {'ticket': ticket, 'summary': summary})
                    except BaseException:
                        Path(filename).unlink(missing_ok=True)
                        raise
                elif path == '/api/restore/apply' and method == 'POST':
                    data = decode(self.body(4096))
                    if not isinstance(data, dict):
                        raise ValueError('Invalid restore confirmation')
                    if not isinstance(data.get('ticket'), str) or data.get('confirm') != 'replace-wardrobe':
                        raise ValueError('Restore requires explicit replacement confirmation')
                    ticket = self.server.tickets.pop(data.get('ticket'), None)
                    if not ticket:
                        raise ValueError('Restore preview has expired. Choose the backup again.')
                    try:
                        with contextlib.closing(Archive(ticket[0])) as archive:
                            recovery = self.server.store.restore(archive, replace=True)
                        self.send_data(200, {'ok': True, 'recoverySaved': bool(recovery)})
                    finally:
                        ticket[0].unlink(missing_ok=True)
                elif path == '/api/restore/cancel' and method == 'POST':
                    data = decode(self.body(4096))
                    if not isinstance(data, dict) or not isinstance(data.get('ticket'), str):
                        raise ValueError('Invalid restore ticket')
                    ticket = self.server.tickets.pop(data['ticket'], None)
                    if ticket:
                        ticket[0].unlink(missing_ok=True)
                    self.send_data(200, {'ok': True})
                else:
                    self.send_data(404, {'error': 'Not found'})
        except (ValueError, KeyError, zipfile.BadZipFile, UnicodeError) as error:
            # Validation messages are authored by this service, never record contents.
            message = str(error) if isinstance(error, ValueError) and not isinstance(error, (json.JSONDecodeError, UnicodeError)) else 'Invalid backup or request data'
            self.send_data(400, {'error': message})
        except Exception:
            self.send_data(500, {'error': 'The local storage operation failed. Existing records were not partially restored.'})

    def expire_tickets(self):
        for ticket, (filename, created) in list(self.server.tickets.items()):
            if time.monotonic() - created > 900:
                self.server.tickets.pop(ticket)
                filename.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, required=True, help='Private data folder outside the source repository')
    parser.add_argument('--port', type=int, default=6684)
    parser.add_argument('--lan-ip', help='Opt in to trusted Wi-Fi access: this laptop’s private IPv4 address')
    parser.add_argument('--import-folder', type=Path, help='Verified legacy folder with backup.json, index.html and _blob/')
    parser.add_argument('--prepare-only', action='store_true', help='Import/verify without opening a network port')
    parser.add_argument('--export-backup', type=Path, help='Write a complete backup ZIP before exiting or serving')
    args = parser.parse_args()
    if args.data.resolve().is_relative_to(ROOT):
        parser.error('Keep the private data folder outside the source repository.')
    host = args.lan_ip or '127.0.0.1'
    if args.lan_ip:
        try:
            address = ipaddress.IPv4Address(host)
            if not address.is_private or address.is_loopback or address.is_unspecified or address.is_link_local:
                raise ValueError()
        except ValueError:
            parser.error('--lan-ip must be the laptop’s private Wi-Fi IPv4 address.')
    os.umask(0o077)
    store = Store(args.data)
    if args.import_folder:
        source = Folder(args.import_folder)
        store.restore(source)  # Refuse to replace a nonempty instance from a routine start command.
        print('Imported a copy:', encode(source.summary))
    if args.export_backup:
        if args.export_backup.exists():
            parser.error('Export target already exists; choose a new filename.')
        print('Backup exported:', encode(store.export(args.export_backup)))
    report = store.verification()
    report.pop('assetHashes')
    print('Storage verification:', encode(report))
    if not args.prepare_only:
        server = LocalServer(args.port, store, host)
        print(f'Open http://{host}:{server.server_address[1]}/. Stop with Ctrl+C.', flush=True)
        if args.lan_ip:
            print('LAN mode: no login required. Use one editing device at a time.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


if __name__ == '__main__':
    main()
