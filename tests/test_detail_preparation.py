"""Existing-piece title/tag handoffs use isolated synthetic wardrobes."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
import detail_preparation as details
from storage import Store
from test_runtime import PNG


class DetailPreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'closet')
        photo = self.store.upload(PNG)
        self.store.set_record('custom', 'tee', {'name': 'Cluttered seller title', 'meta': 'Tops', 'sub': 'T-shirts', 'colors': ['black'], 'photoId': photo, 'title': 'Original seller text', 'size': 'XXL', 'wears': ['2026-10-31'], 'price': 12, 'fav': True})
        self.store.set_record('custom', 'missing', {'name': 'Missing photo', 'meta': 'Tops'})
        self.instance = self.store.state()['instance']
        self.entries = [{'id': 'c-tee', 'fields': [{'key': 'name'}, {'key': 'colors', 'vocab': ['black', 'white']}]}]
        self.before = self.store.state()

    def tearDown(self):
        self.temp.cleanup()

    def create(self, request='test', mode='both', entries=None):
        return details.create(self.store, self.instance, request, mode, entries or self.entries)

    def test_large_title_request_and_mode_limits(self):
        entries = []
        for i in range(49):
            key = 'batch-' + str(i)
            self.store.set_record('custom', key, {'name': 'Seller title ' + str(i), 'meta': 'Tops'})
            entries.append({'id': 'c-' + key, 'fields': [{'key': 'name'}]})
        result = self.create('titles48', 'titles', entries[:48])
        self.assertEqual(len(result['request']['pieces']), 48)
        with self.assertRaises(ValueError):
            self.create('titles49', 'titles', entries)
        with self.assertRaises(ValueError):
            self.create('tags26', 'tags', entries[:26])

    def test_scoped_sources_canonical_metadata_and_repeatable_request(self):
        result = self.create()
        request = result['request']
        row = request['pieces'][0]
        self.assertEqual(row['current'], {'name': 'Cluttered seller title', 'colors': ['black']})
        self.assertEqual(row['originalTitle'], 'Original seller text')
        self.assertEqual((Path(result['folder']) / row['source']).read_bytes(), PNG)
        text = json.dumps(request)
        for private in ('wears', 'fav', 'price', 'size', 'photoId'):
            self.assertNotIn('"' + private + '"', text)
        self.store.set_record('edits', 'c-tee', {'name': 'Later edit'})
        self.assertEqual(self.create(), result)
        self.assertNotIn('Later edit', json.dumps(result))
        self.assertEqual(details.info(self.store, self.instance, 'test'), result)

    def test_check_identity_missing_results_and_no_wardrobe_mutation(self):
        result = self.create()
        with self.assertRaisesRegex(ValueError, 'No suggestions yet'):
            details.check(self.store, self.instance, 'test')
        returned = {'format': 'closetlint-tidy-details/v1', 'instance': self.instance, 'requestId': 'test', 'pieces': [{'id': 'c-tee', 'changes': {'name': 'Black tee'}}]}
        target = Path(result['folder']) / 'results.json'
        target.write_text(json.dumps(returned))
        self.assertEqual(details.check(self.store, self.instance, 'test'), returned)
        self.assertEqual(self.store.state(), self.before)
        returned['requestId'] = 'other'
        target.write_text(json.dumps(returned))
        with self.assertRaisesRegex(ValueError, 'different request'):
            details.check(self.store, self.instance, 'test')
        target.write_text(' ' * (2 * 1024 * 1024 + 1))
        with self.assertRaisesRegex(ValueError, 'under 2 MB'):
            details.check(self.store, self.instance, 'test')

    def test_reject_wrong_instance_path_links_and_reused_selection(self):
        with self.assertRaises(ValueError):
            details.create(self.store, 'other', 'test', 'titles', self.entries)
        with self.assertRaises(ValueError):
            self.create('../escape')
        result = self.create()
        with self.assertRaisesRegex(ValueError, 'another selection'):
            self.create(mode='titles')
        outside = self.root / 'outside.json'
        outside.write_text('{}')
        (Path(result['folder']) / 'results.json').symlink_to(outside)
        with self.assertRaises(ValueError):
            details.check(self.store, self.instance, 'test')
        base = details.location(self.store, self.instance, 'linked')
        base.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.create('linked')
        self.assertEqual(self.store.state(), self.before)

    def test_reject_unrelated_fields_invalid_vocabulary_scope_and_duplicate_ids(self):
        for field in ({'key': 'size', 'vocab': ['XXL']}, {'key': 'colors', 'vocab': ['invented']}, {'key': 'eartags', 'vocab': ['micro']}):
            with self.assertRaises(ValueError):
                self.create(entries=[{'id': 'c-tee', 'fields': [field]}])
        with self.assertRaises(ValueError):
            self.create(entries=self.entries * 2)
        with self.assertRaises(ValueError):
            self.create(mode='unexpected')
        self.assertEqual(self.store.state(), self.before)

    def test_missing_photo_still_allows_metadata_suggestions(self):
        request = self.create(entries=[{'id': 'c-missing', 'fields': []}])['request']
        self.assertEqual(request['pieces'][0]['source'], '')
        self.assertTrue(request['pieces'][0]['photoNote'])
        self.assertEqual(self.store.state(), self.before)
