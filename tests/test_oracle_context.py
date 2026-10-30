"""Synthetic Oracle handoffs: scope, identity, permissions, and no wardrobe writes."""
import json
import subprocess
import sys
import unittest
from unittest.mock import patch
import test_runtime as rt
from oracle_context import access_info, prepare, read_context, request_folder, ROOT


class OracleContextTests(unittest.TestCase):
    setUp = rt.RuntimeTests.setUp
    tearDown = rt.RuntimeTests.tearDown
    load = rt.RuntimeTests.load
    call = rt.RuntimeTests.call
    token = {'X-ClosetLint-Token': 'test-token'}

    def identity(self):
        return self.store.state()['instance']

    def test_hosted_metadata_does_not_claim_assistant_connection(self):
        with patch.dict('os.environ', {'CLOSETLINT_ORIGIN': 'https://test.sg-host.com'}):
            info = access_info(self.store.folder, self.identity())
        self.assertTrue(info['hosted'])
        self.assertEqual(info['origin'], 'https://test.sg-host.com')
        self.assertFalse(info['verified'])

    def test_scoped_snapshot_and_reader_leave_database_unchanged(self):
        self.load()
        before = self.store.path.read_bytes()
        info = prepare(self.store, self.identity(), {'context': 'Only the chosen tee. No private notes.', 'ids': ['c-demo']})
        self.assertEqual(read_context(self.store.folder, self.identity(), info['request']), 'Only the chosen tee. No private notes.')
        proc = subprocess.run([sys.executable, str(ROOT / 'tools/read_oracle.py'), '--data', str(self.store.folder), '--expected-instance', self.identity(), '--request', info['request']], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertNotIn('XXL', proc.stdout)
        self.assertNotIn('photo-', proc.stdout)
        self.assertEqual(before, self.store.path.read_bytes())
        self.assertEqual((request_folder(self.store.folder, info['request']) / 'context.json').stat().st_mode & 0o777, 0o600)
        with self.assertRaises(ValueError):
            read_context(self.store.folder, 'another-wardrobe', info['request'])
        with self.assertRaises(ValueError):
            read_context(self.store.folder, self.identity(), '../outside')

    def test_import_access_can_be_reused_without_photo_readiness(self):
        self.assertFalse(access_info(self.store.folder, self.identity())['verified'])
        marker = {'wardrobeId': 'wardrobe:' + self.identity(), 'appFolder': str(ROOT), 'dataFolder': str(self.store.folder), 'ready': False, 'checkedAt': 123}
        self.store.set_record('profile', 'assistantSetup', marker)
        with patch('assistant_import.readiness', side_effect=AssertionError('No photo environment check')):
            self.assertTrue(access_info(self.store.folder, self.identity())['verified'])
        self.store.set_record('profile', 'assistantSetup', {**marker, 'appFolder': '/moved'})
        self.assertFalse(access_info(self.store.folder, self.identity())['verified'])

    def test_photos_are_opt_in_and_must_belong_to_scope(self):
        self.load()
        before = self.store.path.read_bytes()
        info = prepare(self.store, self.identity(), {'context': 'Chosen tee', 'ids': ['c-demo'], 'photoIds': ['c-demo']})
        text = read_context(self.store.folder, self.identity(), info['request'])
        self.assertIn('c-demo', text)
        target = request_folder(self.store.folder, info['request'])
        self.assertEqual((target / 'photo-1.png').read_bytes(), rt.PNG)
        self.assertEqual(before, self.store.path.read_bytes())
        for photos in (['other'], ['c-demo'] * 13, ['c-demo', 'c-demo']):
            with self.assertRaises(ValueError):
                prepare(self.store, self.identity(), {'context': 'Tee', 'ids': ['c-demo'], 'photoIds': photos})
        (target / 'photo-1.png').unlink()
        (target / 'photo-1.png').symlink_to(self.store.path)
        with self.assertRaises(ValueError):
            read_context(self.store.folder, self.identity(), info['request'])

    def test_missing_database_does_not_create_a_wardrobe(self):
        missing = self.root / 'missing'
        with self.assertRaises(Exception):
            read_context(missing, 'wrong', 'a' * 32)
        self.assertFalse(missing.exists())

    def test_endpoints_require_existing_runtime_authorization(self):
        self.load()
        payload = {'instance': self.identity(), 'context': 'Selected context', 'ids': ['c-demo']}
        status, _ = self.call('GET', '/api/oracle/access?instance=' + self.identity())
        self.assertEqual(status, 403)
        status, _ = self.call('POST', '/api/oracle/prepare', json.dumps(payload).encode())
        self.assertEqual(status, 403)
        status, body = self.call('GET', '/api/oracle/access?instance=' + self.identity(), headers=self.token)
        self.assertEqual(status, 200)
        self.assertFalse(json.loads(body)['verified'])
        status, body = self.call('POST', '/api/oracle/prepare', json.dumps(payload).encode(), headers=self.token)
        self.assertEqual(status, 200, body)
        self.assertEqual(read_context(self.store.folder, self.identity(), json.loads(body)['request']), 'Selected context')
        status, _ = self.call('POST', '/api/oracle/prepare', json.dumps({**payload, 'instance': 'wrong'}).encode(), headers=self.token)
        self.assertEqual(status, 400)
