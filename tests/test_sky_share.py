"""Social metadata and data-preservation checks; synthetic data only."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sky_share', ROOT / 'tools/build_sky_share.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SkyShareTests(unittest.TestCase):
    def test_sky_has_own_metadata_and_root_keeps_its_image_and_data(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder)
            (site / '_blob').mkdir()
            page = (ROOT / 'app/closet-lint.html').read_text()
            for key, value in [('catalog', [{'id': 'synthetic', 'name': '</script><b>test</b>'}]), ('tags', {}), ('bundles', []), ('pubdata', {'profile': {}, 'site': 'dev'})]:
                page = module.embed(page, key, value)
            old_image = '<meta property="og:image" content="https://example.test/original.png">'
            page = page.replace('</head>', old_image + '</head>')
            (site / 'index.html').write_text(page)
            (site / '.htaccess').write_text('Header always set Content-Security-Policy "old"\n')
            self.assertEqual(module.build(site, 'https://example.test/'), 'https://example.test/sky.html')
            index = (site / 'index.html').read_text()
            sky = (site / 'sky.html').read_text()
            self.assertIn(old_image, index)
            self.assertNotIn(old_image, sky)
            self.assertIn('property="og:image" content="https://example.test/sky-opengraph.png"', sky)
            self.assertIn('property="og:url" content="https://example.test/sky.html"', sky)
            for key in ('catalog', 'tags', 'bundles'):
                self.assertEqual(module.json_block(index, key)[1], module.json_block(page, key)[1])
                self.assertEqual(module.json_block(sky, key)[1], module.json_block(page, key)[1])
            self.assertNotIn('skyLanding', module.json_block(index, 'pubdata')[1])
            self.assertTrue(module.json_block(sky, 'pubdata')[1]['skyLanding'])
            self.assertEqual((site / 'sky-opengraph.png').read_bytes(), (ROOT / 'app/assets/social/sky-opengraph.png').read_bytes())
            self.assertNotIn('<script><b>test', sky)

    def test_rejects_invalid_destination_before_writing(self):
        with self.assertRaises(ValueError):
            module.build(Path('/nonexistent'), 'javascript:alert(1)')


if __name__ == '__main__':
    unittest.main()
