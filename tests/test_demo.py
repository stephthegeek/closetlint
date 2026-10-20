import ast
import contextlib
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
sys.path.insert(0,str(ROOT/'runtime'))
from create_demo import demo_source
from storage import Store, Archive, media_type


class DemoTests(unittest.TestCase):
    def test_sample_uses_real_taxonomy_and_has_only_synthetic_data(self):
        demo=demo_source();source=(ROOT/'app/closet-lint.html').read_text()
        subs=ast.literal_eval(re.search(r'var SUBS=(\{.*?\});',source,re.S)[1])
        fits=ast.literal_eval(re.search(r'var FITS=(\[.*?\]);',source,re.S)[1])
        catalog=demo.payload['base']['catalog']
        self.assertEqual(len(catalog),12)
        self.assertEqual(sum(bool(p.get('wish')) for p in catalog),2)
        for piece in catalog:
            self.assertIn(piece['sub'],subs[piece['meta']])
            self.assertTrue(set(piece['fits']).issubset(fits))
            self.assertEqual(piece['source'],'Synthetic sample')
            self.assertNotIn('rx',piece)
            self.assertEqual(media_type(demo.read_asset(piece['photoId'])),'image/jpeg')
        self.assertEqual(len(demo.assets),12)
        for piece in catalog:
            photo=piece['photos'][0]
            self.assertTrue(photo['generated'])
            self.assertEqual(photo['kind'],'isolated')
            self.assertLessEqual(max(photo['width'],photo['height']),1600)
            self.assertEqual(piece['ar'],photo['width']/photo['height'])
        self.assertEqual(demo.payload['collections']['measurements'],{})
        self.assertTrue(demo.payload['collections']['profile']['demo']['synthetic'])
        group=demo.payload['collections']['profile']['collection-imaginary']
        self.assertEqual(group['kind'],'piece-collection')
        self.assertEqual(len(set(group['ids'])),12)
        selected=[p for p in catalog if p['id'] in group['ids']]
        self.assertEqual(len(selected),12)
        self.assertTrue(any(p.get('wish') for p in selected))
        self.assertTrue({'Tops','Bottoms','One-pieces','Footwear','Jewelry'}.issubset({p['meta'] for p in selected}))

    def test_sample_exports_restores_and_cannot_overwrite_a_wardrobe(self):
        demo=demo_source()
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);store=Store(root/'first');store.restore(demo)
            with self.assertRaises(ValueError):store.restore(demo)
            store.export(root/'sample.zip')
            other=Store(root/'second')
            with contextlib.closing(Archive(root/'sample.zip')) as backup:other.restore(backup)
            self.assertEqual(store.state()['base'],other.state()['base'])
            self.assertEqual(store.state()['collections']['profile']['collection-imaginary'],other.state()['collections']['profile']['collection-imaginary'])
            self.assertEqual(store.verification()['assetHashes'],other.verification()['assetHashes'])


if __name__=='__main__':unittest.main()
