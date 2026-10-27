"""The scoring report is read-only and keeps personal outputs outside source."""
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SkyReportTest(unittest.TestCase):
    def test_report_does_not_change_database_or_copy_unrelated_data(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            database = folder / 'wardrobe.sqlite3'
            with sqlite3.connect(database) as db:
                db.execute('CREATE TABLE metadata(key TEXT,payload TEXT)')
                db.execute('CREATE TABLE documents(collection TEXT,id TEXT,payload TEXT)')
                base = {'catalog': [{'id': 'shirt-' + str(i), 'name': 'Synthetic shirt', 'meta': 'Tops', 'looks': ['classic', 'minimalist', 'elegant'], 'price': 'SECRET-PRICE', 'url': 'SECRET-URL'} for i in range(15)], 'tags': {}, 'bundles': []}
                db.execute('INSERT INTO metadata VALUES (?,?)', ('base', json.dumps(base)))
                db.execute('INSERT INTO documents VALUES (?,?,?)', ('profile', 'wear', json.dumps({'tops': 'SECRET-SIZE'})))
            before = hashlib.sha256(database.read_bytes()).hexdigest()
            result = subprocess.run([sys.executable, str(ROOT / 'tools/score_sky.py'), '--data', str(folder), '--date', '2026-10-20', '--out', str(folder / 'report')], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(hashlib.sha256(database.read_bytes()).hexdigest(), before)
            for file in ('index.html', 'scores.json'):
                text = (folder / 'report' / file).read_text()
                self.assertIn('Synthetic shirt', text)
                self.assertNotIn('SECRET-', text)

    def test_missing_wardrobe_is_not_created(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            result = subprocess.run([sys.executable, str(ROOT / 'tools/score_sky.py'), '--data', str(folder), '--date', '2026-10-20', '--out', str(folder / 'report')], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((folder / 'wardrobe.sqlite3').exists())


if __name__ == '__main__':
    unittest.main()
