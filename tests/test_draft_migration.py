import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from storage import Store
spec = importlib.util.spec_from_file_location('migrate_drafts', ROOT / 'tools/migrate_drafts.py')
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class DraftMigrationTests(unittest.TestCase):
    def test_preserves_layout_metadata_board_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            store = Store(folder)
            draft = {'name': 'Example', 'pieces': [{'id': 'synthetic', 'x': 3, 'clip': [[0, 0], [1, 1]]}], 'texts': [{'text': 'Hello'}], 'st': {'bg': 'pink'}, 'at': 123}
            store.set_record('drafts', 'old', draft)
            store.set_record('outfits', 'existing', {'name': 'Example', 'pieces': []})
            store.set_board({'name': 'Working board', 'pieces': []})
            before = store.state()['board']
            result = migration.migrate(store)
            saved = store.state()
            self.assertEqual(result['converted'], 1)
            self.assertTrue(Path(result['recovery']).exists())
            self.assertEqual(saved['collections']['drafts'], {})
            outfit = saved['collections']['outfits']['recovered-old']
            self.assertEqual(outfit['name'], 'Example (2)')
            for key in ('pieces', 'texts', 'st'):
                self.assertEqual(outfit[key], draft[key])
            self.assertEqual(outfit['updatedAt'], 123)
            self.assertEqual(saved['board'], before)
            self.assertEqual(migration.migrate(store)['converted'], 0)

    def test_invalid_draft_rolls_back_every_record(self):
        with tempfile.TemporaryDirectory() as folder:
            store = Store(folder)
            store.set_record('drafts', 'a', {'pieces': []})
            store.set_record('drafts', 'b', {'pieces': 'invalid'})
            with self.assertRaises(ValueError):
                migration.migrate(store)
            saved = store.state()['collections']
            self.assertEqual(len(saved['drafts']), 2)
            self.assertEqual(saved['outfits'], {})
