"""Only temporary synthetic wardrobes: acquisition metadata and durable history backups."""
import contextlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Archive, Store, encode, validate_piece
from piece_import import record, prepare_batch, import_batch

class DataHistoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.store = Store(self.root / 'wardrobe')
        self.piece = dict(name='Synthetic tee', category='Tops', subcategory='Tees', status='owned')

    def test_acquisition_precision_unknown_and_invalid(self):
        for value, full in [('2020', '2020-01-01'), ('2020-02', '2020-02-01'), ('2020-02-29', '2020-02-29')]:
            row = record({**self.piece, 'date': value, 'dateApproximate': True}, [])
            self.assertEqual((row['acquiredDate'], row['date'], row['acquiredApproximate']), (value, full, True))
            validate_piece(row)
        row = record(self.piece, [])
        self.assertEqual(row['acquiredDate'], '')
        self.assertEqual(row['acquisitionSource'], 'unknown')
        for value in ('0000', '2021-02-29', '2020-13', '2020-01-32', '2020-1', 2020):
            with self.assertRaises(ValueError):
                record({**self.piece, 'date': value}, [])
        for value in ('true', 1, None):
            with self.assertRaises(ValueError):
                record({**self.piece, 'dateApproximate': value}, [])

    def test_new_added_time_is_stable_legacy_is_not_backfilled(self):
        self.store.set_record('custom', 'new', {'name': 'New'})
        stamp = self.store.state()['collections']['custom']['new']['addedAt']
        self.store.set_record('custom', 'new', {'name': 'Changed'})
        self.assertEqual(self.store.state()['collections']['custom']['new']['addedAt'], stamp)
        with self.store.connect() as db:
            db.execute('INSERT INTO documents VALUES (?,?,?)', ('custom', 'legacy', encode({'name': 'Old', 'date': '2020-01-01'})))
        self.store.set_record('custom', 'legacy', {'name': 'Old renamed', 'date': '2020-01-01'})
        legacy = self.store.state()['collections']['custom']['legacy']
        self.assertNotIn('addedAt', legacy)
        self.assertNotIn('acquiredDate', legacy)

    def test_direct_import_repeat_preserves_added_time_and_estimate(self):
        manifest = self.root / 'import.json'
        manifest.write_text(json.dumps({'format': 'closet-lint-import/v1', 'batchId': 'date-test', 'pieces': [{**self.piece, 'date': '2020', 'dateApproximate': True}]}))
        prepared = prepare_batch(manifest, allow_no_photo=True)
        self.assertEqual(import_batch(self.store, *prepared, apply=True)['added'], 1)
        before = self.store.state()['collections']['custom']
        self.assertEqual(import_batch(self.store, *prepared, apply=True)['added'], 0)
        self.assertEqual(self.store.state()['collections']['custom'], before)
        row = next(iter(before.values()))
        self.assertTrue(row['addedAt'])
        self.assertEqual((row['acquiredDate'], row['acquiredApproximate']), ('2020', True))

    def test_outfit_delete_retains_latest_grouping_in_one_transaction(self):
        self.store.set_record('outfits', 'one', {'name': 'Outfit', 'pieces': [{'id': 'p'}], 'wearLog': [{'d': '2020-01-01', 'ids': ['p']}]})
        self.store.set_record('outfitHistory', 'one', {'name': 'Older snapshot', 'pieces': [], 'wearLog': []})
        self.store.delete_record('outfits', 'one')
        state = self.store.state()['collections']
        self.assertNotIn('one', state['outfits'])
        self.assertEqual(state['outfitHistory']['one']['wearLog'][0]['ids'], ['p'])
        self.assertEqual(state['outfitHistory']['one']['name'], 'Outfit')
        self.store.delete_record('outfits', 'one')
        self.assertEqual(self.store.state()['collections']['outfitHistory'], state['outfitHistory'])

    def test_full_backup_keeps_history_and_reads_legacy_backup(self):
        history = {'name': 'Deleted outfit', 'pieces': [{'id': 'p'}], 'wearLog': [{'d': '2020-01-01', 'ids': ['p'], 'eventId': 'one', 'recordedAt': '2026-10-28T12:00:00Z'}]}
        self.store.set_record('outfitHistory', 'one', history)
        self.store.set_record('custom', 'one', {'name': 'Tee', 'acquiredDate': '2020', 'acquiredApproximate': True, 'acquisitionSource': 'user'})
        target = self.root / 'backup.zip'
        self.store.export(target)
        restored = Store(self.root / 'restored')
        with contextlib.closing(Archive(target)) as source:
            self.assertEqual(source.payload['formatVersion'], 2)
            restored.restore(source)
            payload = json.loads(encode(source.payload))
        self.assertEqual(restored.state()['collections'], self.store.state()['collections'])
        payload['formatVersion'] = 1
        payload['collections'].pop('outfitHistory')
        legacy = self.root / 'legacy.zip'
        with zipfile.ZipFile(legacy, 'w') as archive:
            archive.writestr('backup.json', encode(payload))
        with contextlib.closing(Archive(legacy)) as source:
            Store(self.root / 'legacy-restored').restore(source)
        payload['formatVersion'] = 2
        with zipfile.ZipFile(legacy, 'w') as archive:
            archive.writestr('backup.json', encode(payload))
        with self.assertRaises(ValueError):
            Archive(legacy)
