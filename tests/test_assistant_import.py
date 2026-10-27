"""Direct handoff checks use disposable wardrobes; never an installed personal wardrobe."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
from unittest.mock import patch
import unittest
import test_runtime as rt
from assistant_import import check_setup, saved_status, setup_info, shell_command, ROOT
from piece_import import import_batch, prepare_batch
from storage import Archive, Store

READY = {'ready': True, 'photoCheck': {}, 'photoSetupCommand': 'python setup'}


class AssistantImportTests(unittest.TestCase):
    setUp = rt.RuntimeTests.setUp
    tearDown = rt.RuntimeTests.tearDown
    call = rt.RuntimeTests.call
    token = {'X-ClosetLint-Token': 'test-token'}

    def identity(self):
        return self.store.state()['instance']

    def prepared(self):
        folder = self.root / 'batch'
        folder.mkdir(exist_ok=True)
        manifest = folder / 'import.json'
        manifest.write_text(json.dumps({'format': 'closet-lint-import/v1', 'batchId': 'review-batch', 'pieces': [
            {'name': 'Synthetic no-photo tee', 'category': 'Tops', 'subcategory': 'Tees', 'status': 'owned'}]}))
        return prepare_batch(manifest, allow_no_photo=True)

    def test_info_is_authorized_and_never_embedded_in_app_or_public_paths(self):
        for path in ('/api/import/setup?batch=review-batch', '/api/import/status?batch=review-batch&instance=' + self.identity()):
            code, body = self.call('GET', path)
            self.assertEqual(code, 403)
            self.assertNotIn(str(self.store.folder), body.decode())
        with patch('assistant_import.readiness', return_value=READY):
            code, body = self.call('GET', '/api/import/setup?batch=review-batch', headers=self.token)
        self.assertEqual(code, 200)
        info = json.loads(body)
        self.assertEqual(info['dataFolder'], str(self.store.folder))
        self.assertIn(info['platform'], ('Linux', 'Windows', 'Darwin'))
        self.assertEqual(info['instance'], self.identity())
        self.assertIn('--expected-instance', info['applyCommand'])
        self.assertNotIn('test-token', body.decode())
        self.assertNotIn(str(self.store.folder), rt.render_app(self.store, 'test-token'))
        for batch in ('', '../escape', 'x;echo bad', 'x' * 81):
            self.assertEqual(self.call('GET', '/api/import/setup?batch=' + batch, headers=self.token)[0], 400)

    def test_setup_marker_is_real_evidence_but_not_an_import(self):
        with patch('assistant_import.readiness', return_value=READY):
            initial = setup_info(self.store, 'review-batch')
            self.assertFalse(initial['setupVerified'])
            result = check_setup(self.store, self.identity(), 'review-batch')
            self.assertTrue(result['setupVerified'])
            self.assertFalse(result['committed'])
            info = setup_info(self.store, 'next-batch')
            self.assertTrue(info['setupVerified'], 'later batches can reuse verified local setup')
        status = saved_status(self.store, self.identity(), 'review-batch')
        self.assertTrue(status['setupVerified'])
        self.assertFalse(status['saved'])
        self.assertIsNone(status['report'])
        self.assertFalse(self.store.state()['collections']['custom'])
        # Moving the app/data folders invalidates the reusable setup marker.
        with patch('assistant_import.ROOT', ROOT / 'moved'):
            self.assertFalse(saved_status(self.store, self.identity(), 'review-batch')['setupVerified'])

    def test_missing_photo_tools_do_not_verify_setup(self):
        with patch('assistant_import.readiness', return_value={**READY, 'ready': False}):
            self.assertFalse(check_setup(self.store, self.identity(), 'review-batch')['setupVerified'])
        self.assertFalse(saved_status(self.store, self.identity(), 'review-batch')['setupVerified'])
        self.assertFalse(self.store.state()['collections']['custom'])

    def test_wrong_destination_refuses_setup_status_preview_and_apply(self):
        before = self.store.state()
        with self.assertRaisesRegex(ValueError, 'Wrong wardrobe'):
            check_setup(self.store, 'wrong', 'review-batch')
        with self.assertRaisesRegex(ValueError, 'Wrong wardrobe'):
            saved_status(self.store, 'wrong', 'review-batch')
        for apply in (False, True):
            with self.assertRaisesRegex(ValueError, 'Wrong wardrobe'):
                import_batch(self.store, *self.prepared(), apply=apply, expected_instance='wrong')
        self.assertEqual(self.store.state(), before)
        self.assertEqual(self.call('GET', '/api/import/status?batch=review-batch&instance=wrong', headers=self.token)[0], 409)

    def test_preview_apply_receipt_retry_and_backup(self):
        expected = self.identity()
        batch = self.prepared()
        preview = import_batch(self.store, *batch, expected_instance=expected)
        self.assertEqual(preview['mode'], 'preview')
        self.assertFalse(saved_status(self.store, expected, 'review-batch')['saved'])
        report = import_batch(self.store, *batch, apply=True, expected_instance=expected)
        self.assertEqual(report['added'], 1)
        result = saved_status(Store(self.store.folder), expected, 'review-batch')
        self.assertTrue(result['saved'])
        self.assertEqual(result['report']['added'], 1)
        with patch('server.import_readiness', return_value={**READY, 'ready': False}):
            code, body = self.call('GET', '/api/import/status?batch=review-batch&instance=' + expected, headers=self.token)
        self.assertEqual(code, 200)
        self.assertTrue(json.loads(body)['saved'], 'a saved receipt remains valid if photo tools later become unavailable')
        self.assertFalse(json.loads(body)['setupVerified'])
        retry = import_batch(self.store, *batch, apply=True, expected_instance=expected)
        self.assertEqual(retry['mode'], 'already-applied')
        self.assertEqual(retry['added'], 0)
        self.assertEqual(saved_status(self.store, expected, 'review-batch')['report']['added'], 1)
        with self.assertRaisesRegex(ValueError, 'Wrong wardrobe'):
            import_batch(self.store, *batch, apply=True, expected_instance='wrong')
        with patch('assistant_import.readiness', return_value=READY):
            check_setup(self.store, expected, 'review-batch')
        buf = io.BytesIO()
        self.store.export(buf)
        buf.seek(0)
        # Setup IDs cannot be mistaken for asset references by full-backup validation.
        with contextlib.closing(Archive(buf)) as archive:
            restored = Store(self.root / 'restored')
            restored.restore(archive)
        self.assertEqual(len(restored.state()['collections']['custom']), 1)

    def test_cli_missing_access_and_wrong_wardrobe_are_actionable(self):
        script = ROOT / 'tools/import_pieces.py'
        for folder, message in ((self.root / 'missing', 'existing wardrobe'), (self.store.folder, 'Wrong wardrobe')):
            result = subprocess.run([sys.executable, str(script), '--data', str(folder), '--expected-instance', 'wrong', '--batch-id', 'review-batch', '--check'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn(message, result.stderr)
        self.assertFalse((self.root / 'missing').exists())
        invalid = self.root / 'not-a-wardrobe'
        invalid.mkdir()
        (invalid / 'wardrobe.sqlite3').touch()
        result = subprocess.run([sys.executable, str(script), '--data', str(invalid), '--expected-instance', 'wrong', '--batch-id', 'review-batch', '--check'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertEqual((invalid / 'wardrobe.sqlite3').stat().st_size, 0, 'checking an unrelated file must not initialize a wardrobe')

    def test_shell_commands_preserve_spaces_and_metacharacters(self):
        import shlex
        args = ['/tmp/Photo tools/python', '/tmp/app $(do-not-run)/import.py', '--data', "/tmp/user's closet", '--expected-instance', 'test']
        self.assertEqual(shlex.split(shell_command(args, windows=False)), args)
        command = shell_command(args, windows=True)
        self.assertTrue(command.startswith("& '/tmp/Photo tools/python'"))
        self.assertIn("'/tmp/user''s closet'", command)


class RequestImportTests(unittest.TestCase):
    setUp = rt.RuntimeTests.setUp
    tearDown = rt.RuntimeTests.tearDown

    def identity(self):
        return self.store.state()['instance']

    def part(self, number, indices):
        from assistant_import import request_part
        from import_sources import folder
        base = folder(self.store, self.identity(), 'test-request')
        base.mkdir(parents=True, exist_ok=True)
        path = base / ('part-' + str(number) + '.json')
        path.write_text(json.dumps({'format': 'closet-lint-import/v1', 'batchId': request_part('test-request', number), 'pieces': [
            {'name': 'Synthetic tee ' + str(i), 'category': 'Tops', 'subcategory': 'Tees', 'status': 'owned',
             'url': 'https://example.com/piece/' + str(i), 'colors': ['black'], 'styles': ['casual'], 'seasons': ['fall']}
            for i in indices]}))
        return path

    def save(self, number, indices, apply=True):
        return import_batch(self.store, *prepare_batch(self.part(number, indices), allow_no_photo=True),
                            apply=apply, expected_instance=self.identity(), request_id='test-request', part=number, cursor='Source page ' + str(number))

    def test_multiple_parts_retry_progress_completion_and_backup(self):
        from assistant_import import finish_request
        first = self.save(1, range(50))
        self.assertEqual(first['added'], 50)
        status = saved_status(self.store, self.identity(), 'test-request')
        self.assertTrue(status['saved'])
        self.assertEqual(status['request']['state'], 'in-progress', 'saved is distinct from finished')
        self.assertEqual(status['request']['nextPart'], 2)
        self.assertEqual(status['request']['cursor'], 'Source page 1')
        finish_request(self.store, self.identity(), 'test-request', 'needs-input', 'One source needs access', 'Source page 2')
        self.assertEqual(saved_status(self.store, self.identity(), 'test-request')['request']['state'], 'needs-input')
        second = self.save(2, list(range(50, 60)) + [0])
        self.assertEqual(second['added'], 10)
        self.assertEqual(second['skipped'], 1, 'cross-part duplicate is skipped')
        retry = self.save(2, list(range(50, 60)) + [0])
        self.assertEqual(retry['mode'], 'already-applied')
        status = saved_status(self.store, self.identity(), 'test-request')
        self.assertEqual(status['report']['added'], 60)
        self.assertEqual(status['report']['skipped'], 1)
        self.assertEqual(status['request']['state'], 'in-progress')
        self.assertEqual(len(status['request']['parts']), 2)
        self.assertEqual(len(status['report']['results']), 61)
        status = finish_request(self.store, self.identity(), 'test-request', 'complete', 'Selected dates checked')
        self.assertEqual(status['request']['state'], 'complete')
        self.assertEqual(self.save(2, list(range(50, 60)) + [0])['mode'], 'already-applied', 'completed parts can still be retried')
        with self.assertRaisesRegex(ValueError, 'complete'):
            self.save(3, [99])
        self.assertEqual(len(self.store.state()['collections']['custom']), 60)
        self.assertTrue(all(p['styles'] == ['casual'] and p['seasons'] == ['fall'] for p in self.store.state()['collections']['custom'].values()))
        buf = io.BytesIO()
        self.store.export(buf)
        buf.seek(0)
        with contextlib.closing(Archive(buf)) as archive:
            restored = Store(self.root / 'restored-request')
            restored.restore(archive)
        actual = restored.state()['instance']
        self.assertEqual(saved_status(restored, actual, 'test-request')['report']['added'], 60)

    def test_invalid_parts_wrong_wardrobe_and_atomic_failure(self):
        from assistant_import import finish_request, request_part
        self.save(1, [1])
        with self.assertRaisesRegex(ValueError, 'previous'):
            self.save(3, [3])
        with self.assertRaisesRegex(ValueError, 'Wrong wardrobe'):
            finish_request(self.store, 'wrong', 'test-request', 'complete')
        with self.assertRaisesRegex(ValueError, 'Request part'):
            import_batch(self.store, *prepare_batch(self.part(2, [2]), allow_no_photo=True), apply=True,
                         expected_instance=self.identity(), request_id='other', part=2)
        before = self.store.state()
        with self.assertRaisesRegex(ValueError, 'different content'):
            self.save(1, [8])
        self.assertEqual(self.store.state(), before)
        for value in (0, -1, 100000, True):
            with self.assertRaises(ValueError):
                request_part('test-request', value)
        status = saved_status(self.store, self.identity(), 'test-request')
        self.assertEqual(status['report']['added'], 1)
        self.assertEqual(status['request']['nextPart'], 2)
        zero = finish_request(self.store, self.identity(), 'no-matching-purchases', 'complete', 'No relevant purchases in selected dates')
        self.assertFalse(zero['saved'])
        self.assertEqual(zero['report']['added'], 0)
        self.assertEqual(zero['request']['state'], 'complete')

    def test_request_choices_without_uploads_and_completion_state(self):
        from assistant_import import finish_request
        from import_sources import update, get
        draft = {'route': 'direct', 'method': 'emails', 'store': 'Example Store', 'from': '2026-10-01', 'through': '2026-10-07', 'count': '', 'splitPacks': True, 'productPhotos': True}
        update(self.store, self.identity(), 'test-request', {'files': [], 'draft': draft})
        self.assertEqual(get(self.store, self.identity(), 'test-request')['draft'], draft)
        self.save(1, [1])
        self.assertFalse(get(self.store, self.identity(), 'test-request')['completed'], 'one saved part is not a completed request')
        finish_request(self.store, self.identity(), 'test-request', 'complete')
        self.assertTrue(get(self.store, self.identity(), 'test-request')['completed'])

    def test_cli_part_commands_and_resume(self):
        self.part(1, [1, 2])
        base = [sys.executable, str(ROOT / 'tools/import_pieces.py'), '--data', str(self.store.folder),
                '--expected-instance', self.identity(), '--request-id', 'test-request']
        def command(*args):
            p = subprocess.run(base + list(args), capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            return json.loads(p.stdout)
        self.assertEqual(command('--part', '1', '--allow-no-photo')['mode'], 'preview')
        self.assertEqual(command('--part', '1', '--allow-no-photo', '--apply')['added'], 2)
        self.assertEqual(command('--part', '1', '--allow-no-photo', '--apply')['mode'], 'already-applied')
        self.assertEqual(command('--finish-request', 'paused', '--note', 'Source unavailable', '--cursor', 'Page 2')['request']['state'], 'paused')
        self.assertEqual(command('--finish-request', 'complete')['report']['added'], 2)
