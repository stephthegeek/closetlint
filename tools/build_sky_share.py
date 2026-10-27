#!/usr/bin/env python3
"""Add a Sky-specific social URL to an already approved static app package.

Refreshes code from this source tree while retaining only the package's existing
embedded public data. Does not read a wardrobe database or upload anything.
"""
import argparse
import html
import json
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def json_block(page, key):
    match = re.search(r'(<script\b[^>]*\bid="' + key + r'"[^>]*>)(.*?)(</script>)', page, re.S)
    if not match:
        raise ValueError('Missing public data block: ' + key)
    return match, json.loads(match[2])


def embed(page, key, value):
    match, _ = json_block(page, key)
    encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    return page[:match.start(2)] + encoded + page[match.end(2):]


def build(site_dir, site_url, refresh=True):
    site_dir = Path(site_dir)
    parsed = urlsplit(site_url)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('Use the public HTTPS site root URL, without a query or fragment')
    if not (site_dir / 'index.html').is_file() or not (site_dir / '_blob').is_dir() or site_dir.is_symlink():
        raise ValueError('Choose an existing approved static app package')
    original = (site_dir / 'index.html').read_text()
    _, public = json_block(original, 'pubdata')
    if not isinstance(public, dict):
        raise ValueError('This is not a public static app package')
    page = (ROOT / 'app/closet-lint.html').read_text() if refresh else original
    if refresh:
        for key in ('catalog', 'tags', 'bundles', 'pubdata'):
            _, data = json_block(original, key)
            page = embed(page, key, data)
        # Preserve the site's existing social preview and canonical metadata.
        preserved = re.findall(r'<meta\b[^>]*(?:property|name)=["\'](?:og:|twitter:)[^>]*>|<link\b[^>]*rel=["\']canonical["\'][^>]*>', original, re.I)
        if preserved:
            page = page.replace('</head>', '\n'.join(preserved) + '\n</head>', 1)
    public = dict(public)
    public.pop('skyLanding', None)
    public['skySharePage'] = 'sky.html'
    page = embed(page, 'pubdata', public)
    landing = embed(page, 'pubdata', dict(public, skyLanding=True))
    landing = re.sub(r'<meta\b[^>]*(?:property|name)=["\'](?:og:|twitter:)[^>]*>|<link\b[^>]*rel=["\']canonical["\'][^>]*>', '', landing, flags=re.I)
    landing = re.sub(r'<title>.*?</title>', '<title>Your Style Sky · Closet Lint</title>', landing, count=1, flags=re.S)
    url = site_url.rstrip('/') + '/sky.html'
    image = site_url.rstrip('/') + '/sky-opengraph.png'
    tags = [('og:type', 'website'), ('og:site_name', 'Closet Lint'), ('og:title', 'Your Style Sky · Closet Lint'),
            ('og:description', 'Your closet, mapped in stars. Discover your style Sun, Moon, and Rising.'),
            ('og:url', url), ('og:image', image), ('og:image:width', '1200'), ('og:image:height', '630'),
            ('og:image:alt', 'Your Sky: your closet, mapped in stars, with Linty and a celestial style chart.')]
    metadata = '\n'.join('<meta property="' + key + '" content="' + html.escape(value, quote=True) + '">' for key, value in tags)
    metadata += '\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="' + html.escape(image, quote=True) + '">'
    metadata += '\n<link rel="canonical" href="' + html.escape(url, quote=True) + '">\n'
    landing = landing.replace('</head>', metadata + '</head>', 1)
    # Each page gets hashes for its exact inline blocks, including JSON data.
    import sys
    sys.path.insert(0, str(ROOT / 'runtime'))
    from server import content_policy
    policy = content_policy(page)
    headers = site_dir / '.htaccess'
    text = headers.read_text() if headers.exists() else ''
    text = re.sub(r'Header always set Content-Security-Policy "[^"]*"', lambda _: 'Header always set Content-Security-Policy "' + policy + '"', text)
    text = re.sub(r'\n?# BEGIN SKY SHARE HEADERS.*?# END SKY SHARE HEADERS\n?', '', text, flags=re.S)
    text += '\n# BEGIN SKY SHARE HEADERS\n<IfModule mod_headers.c>\n<Files "sky.html">\nHeader always set Content-Security-Policy "' + content_policy(landing) + '"\n</Files>\n</IfModule>\n# END SKY SHARE HEADERS\n'
    # Prepare everything before replacing the package files.
    image_source = ROOT / 'app/assets/social/sky-opengraph.png'
    if not image_source.is_file():
        raise ValueError('Missing Sky social image')
    (site_dir / 'index.html').write_text(page)
    (site_dir / 'sky.html').write_text(landing)
    shutil.copyfile(image_source, site_dir / 'sky-opengraph.png')
    headers.write_text(text)
    return url


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-dir', type=Path, required=True)
    parser.add_argument('--site-url', required=True)
    args = parser.parse_args()
    print(build(args.site_dir, args.site_url))


if __name__ == '__main__':
    main()
