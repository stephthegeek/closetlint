"""A wear action is one durable transaction; fixtures never use a real closet."""
import sqlite3
import unittest
from unittest.mock import patch
import test_stale_writes as helpers
from storage import write_version


class AtomicWearTests(unittest.TestCase):
    setUp = helpers.StaleWriteTests.setUp
    tearDown = helpers.StaleWriteTests.tearDown
    call = helpers.StaleWriteTests.call
    state = helpers.StaleWriteTests.state
    def changes(self):
        return [
            {'collection': 'edits', 'id': 'a', 'expected': write_version(None), 'value': {'wears': ['2026-10-29']}},
            {'collection': 'edits', 'id': 'b', 'expected': write_version(None), 'value': {'wears': ['2026-10-29']}},
            {'collection': 'outfits', 'id': 'one', 'expected': write_version(None),
             'value': {'pieces': [{'id': 'a'}, {'id': 'b'}], 'wearLog': [{'d': '2026-10-29', 'ids': ['a', 'b'], 'added': ['a', 'b']}]}}
        ]

    def test_complete_commit_and_identical_lost_response_retry(self):
        before = self.store.state()
        status, result = self.call('POST', '/api/wear', self.changes())
        self.assertEqual(status, 200)
        self.assertEqual(len(result['versions']), 3)
        after = self.store.state()
        self.assertEqual(after['revision'], before['revision'] + 1)
        self.assertEqual(after['collections']['edits']['a']['wears'], ['2026-10-29'])
        self.assertEqual(self.call('POST', '/api/wear', self.changes())[0], 200)
        self.assertEqual(self.store.state(), after)

    def test_last_record_conflict_changes_nothing(self):
        self.store.set_record('outfits', 'one', {'pieces': [], 'name': 'New phone edit'})
        before = self.store.state()
        self.assertEqual(self.call('POST', '/api/wear', self.changes())[0], 409)
        self.assertEqual(self.store.state(), before)

    def test_last_record_validation_changes_nothing(self):
        changes = self.changes()
        changes[-1]['value']['pieces'] = 'invalid'
        before = self.store.state()
        self.assertEqual(self.call('POST', '/api/wear', changes)[0], 400)
        self.assertEqual(self.store.state(), before)

    def test_failure_after_writes_rolls_everything_back(self):
        before = self.store.state()
        with patch.object(self.store, 'bump', side_effect=sqlite3.OperationalError('disk full')):
            with self.assertRaises(sqlite3.OperationalError):
                self.store.commit_wear(self.changes())
        self.assertEqual(self.store.state(), before)

    def test_removal_is_atomic_including_archived_outfit(self):
        self.store.commit_wear(self.changes())
        self.store.delete_record('outfits', 'one')
        state = self.store.state()
        changes = [{'collection': col, 'id': key, 'expected': write_version(value),
                    'value': {**value, **({'wears': []} if col == 'edits' else {'wearLog': []})}}
                   for col in ('edits', 'outfitHistory') for key, value in state['collections'][col].items()]
        self.store.set_record('edits', 'b', {'wears': ['2026-10-29'], 'note': 'Another tab'})
        before = self.store.state()
        self.assertEqual(self.call('POST', '/api/wear', changes)[0], 409)
        self.assertEqual(self.store.state(), before)
        changes[1]['expected'] = write_version(before['collections']['edits']['b'])
        changes[1]['value']['note'] = 'Another tab'
        self.assertEqual(self.call('POST', '/api/wear', changes)[0], 200)
        after = self.store.state()
        self.assertEqual(after['collections']['edits']['a']['wears'], [])
        self.assertEqual(after['collections']['outfitHistory']['one']['wearLog'], [])

    def test_reject_missing_versions_duplicates_and_wrong_collections(self):
        for kind in ('missing', 'duplicate', 'collection'):
            changes = self.changes()
            if kind == 'missing':
                changes[-1].pop('expected')
            elif kind == 'duplicate':
                changes.append(changes[0])
            else:
                changes[-1]['collection'] = 'profile'
            before = self.store.state()
            self.assertEqual(self.call('POST', '/api/wear', changes)[0], 400)
            self.assertEqual(self.store.state(), before)


if __name__ == '__main__':
    unittest.main()
