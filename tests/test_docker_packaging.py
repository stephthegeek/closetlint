"""Container maintenance boundaries using disposable files and a tiny Git repo."""
import hashlib
import io
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location('docker_' + name, ROOT / 'deploy/docker' / (name + '.py'))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


class DockerPackagingTests(unittest.TestCase):
    @unittest.skipUnless(os.name == 'posix', 'Docker runtime uses Linux file locks')
    def test_photo_configuration_does_not_overwrite_another_installation(self):
        start = module('start')
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            target = folder / 'photo-tools.json'
            original = '{"python":"/another-installation/python","models":"/elsewhere"}'
            target.write_text(original)
            with self.assertRaisesRegex(ValueError, 'another installation'):
                start.configure_photos(folder)
            self.assertEqual(target.read_text(), original)
            target.unlink()
            start.configure_photos(folder)
            before = target.read_bytes()
            start.configure_photos(folder)
            self.assertEqual(target.read_bytes(), before)

    def test_automatic_model_setup_downloads_once_and_reuses_verified_cache(self):
        start = module('start')
        import background_worker as worker
        payload = b'tiny verified model fixture'
        spec = ('https://fixture.invalid/model', hashlib.sha256(payload).hexdigest(), 1, (), ())
        with tempfile.TemporaryDirectory() as temporary, patch.dict(worker.MODELS, {'u2net': spec, 'isnet-general-use': spec}, clear=True):
            folder = Path(temporary)
            with patch.object(worker, 'urlopen', side_effect=lambda *a, **kw: io.BytesIO(payload)) as download:
                self.assertTrue(start.prepare_models(folder))
                self.assertEqual(download.call_count, 2)
            files = list(folder.rglob('*.onnx'))
            before = {str(p): (p.read_bytes(), p.stat().st_mtime_ns) for p in files}
            with patch.object(worker, 'urlopen', side_effect=OSError('offline')) as download:
                self.assertTrue(start.prepare_models(folder))
                download.assert_not_called()
            self.assertEqual({str(p): (p.read_bytes(), p.stat().st_mtime_ns) for p in files}, before)

    def test_automatic_setup_failure_is_nonfatal_and_retryable(self):
        start = module('start')
        import background_worker as worker
        payload = b'recovered model'
        spec = ('https://fixture.invalid/model', hashlib.sha256(payload).hexdigest(), 1, (), ())
        with tempfile.TemporaryDirectory() as temporary, patch.dict(worker.MODELS, {'u2net': spec}, clear=True):
            folder = Path(temporary)
            with patch.object(worker, 'urlopen', side_effect=OSError('offline')), patch('sys.stderr', new_callable=io.StringIO) as errors:
                self.assertFalse(start.prepare_models(folder))
                self.assertIn('app remains usable', errors.getvalue())
            self.assertEqual(list(folder.rglob('*.onnx')), [])
            with patch.object(worker, 'urlopen', return_value=io.BytesIO(payload)):
                self.assertTrue(start.prepare_models(folder))

    def test_publication_context_uses_release_app_and_only_packaging_overlay(self):
        release = module('release_context')
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary) / 'source'
            repo.mkdir()
            def git(*args):
                return subprocess.check_output(['git', *args], cwd=repo, stderr=subprocess.DEVNULL)
            git('init')
            (repo / 'package.json').write_text('{"version":"0.5.0"}')
            (repo / 'app').mkdir()
            (repo / 'app/main.txt').write_text('Released application')
            git('add', '.')
            git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Synthetic release')
            git('tag', 'v0.5.0')
            (repo / 'app/main.txt').write_text('Unreleased changes')
            for name in ('Dockerfile', '.dockerignore', 'compose.yaml'):
                (repo / name).write_text('Reviewed packaging')
            (repo / 'deploy/docker').mkdir(parents=True)
            (repo / 'deploy/docker/start.py').write_text('# reviewed wrapper')
            (repo / 'deploy/docker/private.zip').write_bytes(b'excluded')
            with patch.object(release, 'ROOT', repo):
                destination = Path(temporary) / 'context'
                result = release.prepare('v0.5.0', destination)
                self.assertEqual(result['version'], '0.5.0')
                self.assertEqual((destination / 'app/main.txt').read_text(), 'Released application')
                self.assertEqual((destination / 'Dockerfile').read_text(), 'Reviewed packaging')
                self.assertFalse((destination / 'deploy/docker/private.zip').exists())
                with self.assertRaises(ValueError):
                    release.prepare('main', Path(temporary) / 'bad')
                with self.assertRaises(ValueError):
                    release.prepare('v0.5.0', repo / 'nested')
                with self.assertRaises(ValueError):
                    release.prepare('v0.5.0', destination)


if __name__ == '__main__':
    unittest.main()
