"""Serve the existing HTTP handler over private process pipes, without a listener."""
import argparse
import io
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'runtime'))
from server import Handler, LocalServer
from storage import Store


class RequestInput:
    def __init__(self, prefix, source, length):
        self.prefix = io.BytesIO(prefix)
        self.source = source
        self.remaining = length

    def read(self, size=-1):
        prefix = self.prefix.read(size)
        needed = self.remaining if size < 0 else min(self.remaining, size - len(prefix))
        data = self.source.read(needed) if needed else b''
        self.remaining -= len(data)
        if needed and len(data) != needed:
            raise EOFError('Incomplete gateway upload')
        return prefix + data

    def readline(self, size=-1):
        line = self.prefix.readline(size)
        if line:
            return line
        needed = self.remaining if size < 0 else min(self.remaining, size)
        data = self.source.readline(needed) if needed else b''
        self.remaining -= len(data)
        return data

    def close(self):
        pass  # The next request shares the same private input pipe.

    def drain(self):
        while self.remaining:
            self.read(min(self.remaining, 65536))


class ResponseConnection:
    def __init__(self, request, output):
        self.request = request
        self.output = output
        self.head = bytearray()
        self.started = False

    def makefile(self, mode, *args):
        return self.request

    def sendall(self, data):
        if not self.started:
            self.head.extend(data)
            if b'\r\n\r\n' not in self.head:
                if len(self.head) > 65536:
                    raise ValueError('Response headers too large')
                return
            head, data = bytes(self.head).split(b'\r\n\r\n', 1)
            lines = head.decode('latin-1').split('\r\n')
            status = int(lines[0].split(' ', 2)[1])
            headers = dict(line.split(': ', 1) for line in lines[1:])
            length = int(headers.get('Content-Length', 0))
            self.output.write(json.dumps({'type': 'response', 'status': status, 'headers': headers, 'length': length}).encode() + b'\n')
            self.head.clear()
            self.started = True
        self.output.write(data)
        self.output.flush()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, required=True)
    args = parser.parse_args()
    folder = args.data.resolve()
    if not args.data.is_absolute() or folder.is_relative_to(ROOT) or 'public_html' in folder.parts:
        parser.error('Hosted data must be an absolute private folder outside the source and public_html.')
    os.umask(0o077)
    server = LocalServer(6684, Store(folder), bind_and_activate=False)
    # Requests share one pipe. A cold preview must not delay every later photo;
    # serve its original while the disposable thumbnail warms in the background.
    server.thumbnail_wait = 0
    source, output = sys.stdin.buffer, sys.stdout.buffer
    output.write(b'{"type":"ready"}\n');output.flush()
    try:
        while line := source.readline(65537):
            if len(line) > 65536 or not line.endswith(b'\n'):
                raise ValueError('Gateway headers too large')
            frame = json.loads(line)
            length = frame['length']
            if not isinstance(length, int) or not 0 <= length <= 512 * 1024 * 1024:
                raise ValueError('Invalid upload length')
            headers = frame['headers']
            prefix = (frame['method'] + ' ' + frame['path'] + ' HTTP/1.1\r\n' + ''.join(k + ': ' + v + '\r\n' for k, v in headers.items()) + '\r\n').encode('latin-1')
            request = RequestInput(prefix, source, length)
            Handler(ResponseConnection(request, output), ('127.0.0.1', 0), server)
            request.drain()  # Rejected request bodies cannot become the next request.
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
