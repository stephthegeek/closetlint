"""Probe readiness without rendering the wardrobe or reading its contents."""
import urllib.request

if __name__ == '__main__':
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open('http://127.0.0.1:6684/healthz', timeout=3) as response:
        if response.status != 200 or response.read(64) != b'{"ok":true}':
            raise SystemExit(1)
