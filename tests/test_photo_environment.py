"""Shared photo setup, compatibility, and recovery, using synthetic data only."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from photo_environment import environment, import_in_environment, probe
from background_removal import settings
from storage import Store


def tool(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


READY = {'python': [3, 12, 0], 'packages': {'Pillow': {'ready': True, 'version': '13.0.0'}}}


class PhotoEnvironmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'wardrobe')
        self.folder = self.store.folder
        self.python = self.root / 'photo python.exe'
        self.python.touch()
        self.models = self.root / 'existing models'
        self.model = self.models / 'models/u2net/u2net.onnx'
        self.model.parent.mkdir(parents=True)
        self.model.write_bytes(b'synthetic model')
        self.config = {'python': str(self.python), 'models': str(self.models)}

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, config=None):
        (self.folder / name).write_text(json.dumps(self.config if config is None else config))

    def test_legacy_and_shared_configs_and_moved_environment(self):
        self.write('background-removal.json')
        self.assertEqual(environment(self.folder)['config'], 'background-removal.json')
        self.assertEqual(settings(self.folder)['models'], str(self.models))
        self.write('photo-tools.json')
        self.assertEqual(environment(self.folder)['config'], 'photo-tools.json')
        (self.folder / 'photo-tools.json').write_text('{invalid')
        self.assertEqual(environment(self.folder)['config'], 'background-removal.json')
        self.python.unlink()
        self.assertIsNone(environment(self.folder))
        self.assertIsNone(settings(self.folder))

    def test_relative_or_invalid_config_does_not_execute_python(self):
        for config in ({'python': './python'}, {'python': str(self.python), 'models': []}, [], {'python': None}):
            self.write('photo-tools.json', config)
            with patch('photo_environment.subprocess.run') as run:
                self.assertIsNone(import_in_environment(self.folder, ['--apply']))
                run.assert_not_called()

    def test_import_reuses_legacy_environment_and_preserves_arguments_and_exit_code(self):
        self.write('background-removal.json')
        args = ['--data', str(self.folder), '--file', str(self.root / 'a batch/import.json'), '--apply']
        with patch('photo_environment.subprocess.run', return_value=SimpleNamespace(returncode=2)) as run:
            self.assertEqual(import_in_environment(self.folder, args), 2)
        command = run.call_args.args[0]
        self.assertEqual(command[0], str(self.python))
        self.assertEqual(command[2:], args)
        self.assertNotIn('shell', run.call_args.kwargs)
        with patch('photo_environment.sys.executable', str(self.python)), patch('photo_environment.subprocess.run') as run:
            self.assertIsNone(import_in_environment(self.folder, args))
            run.assert_not_called()

    def test_probe_handles_unusable_python_and_times_out(self):
        self.assertIn('error', probe(self.root / 'missing-python'))
        with patch('photo_environment.subprocess.run', side_effect=subprocess.TimeoutExpired('python', 30)):
            self.assertIn('error', probe(self.python))

    def test_setup_refuses_unknown_wardrobe_before_creating_or_installing(self):
        setup = tool('setup_photos')
        missing = self.root / 'not my wardrobe'
        with patch.object(setup.venv, 'create') as create, patch.object(setup.subprocess, 'run') as run:
            with self.assertRaisesRegex(ValueError, 'existing wardrobe'):
                setup.setup(missing)
            create.assert_not_called()
            run.assert_not_called()
        self.assertFalse(missing.exists())

    def test_legacy_setup_reuses_environment_and_verified_model_without_touching_wardrobe(self):
        setup = tool('setup_photos')
        self.write('background-removal.json')
        before = self.store.verification()
        with patch.object(setup, 'probe', return_value=READY), patch.object(setup.venv, 'create') as create, \
             patch.object(setup.subprocess, 'run') as run, patch('background_worker.verify_model') as verify, contextlib.redirect_stdout(io.StringIO()):
            setup.setup(self.folder, background=True)
        create.assert_not_called()
        self.assertEqual(run.call_args_list[0].args[0][0], str(self.python))
        self.assertEqual(run.call_args_list[1].kwargs['env']['U2NET_HOME'], str(self.models))
        verify.assert_called_once_with(self.model)
        self.assertEqual(json.loads((self.folder / 'photo-tools.json').read_text()), self.config)
        self.assertEqual(self.model.read_bytes(), b'synthetic model')
        self.assertEqual(self.store.verification(), before)

    def test_failed_package_install_preserves_existing_configuration(self):
        setup = tool('setup_photos')
        self.write('background-removal.json')
        before = (self.folder / 'background-removal.json').read_bytes()
        with patch.object(setup, 'probe', return_value=READY), \
             patch.object(setup.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, ['pip'])), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(setup.main(['--data', str(self.folder)]), 2)
        self.assertEqual((self.folder / 'background-removal.json').read_bytes(), before)
        self.assertFalse((self.folder / 'photo-tools.json').exists())

    def test_new_import_environment_stays_available_when_optional_model_download_fails(self):
        setup = tool('setup_photos')
        before = self.store.verification()
        def create(location, **kwargs):
            python = location / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
            python.parent.mkdir(parents=True)
            python.touch()
        with patch.object(setup, 'sys', SimpleNamespace(version_info=(3, 12, 0))), patch.object(setup, 'probe', return_value=READY), \
             patch.object(setup.venv, 'create', side_effect=create), contextlib.redirect_stdout(io.StringIO()), \
             patch.object(setup.subprocess, 'run', side_effect=[SimpleNamespace(returncode=0), subprocess.CalledProcessError(1, ['model'])]):
            with self.assertRaisesRegex(ValueError, 'Photo imports are ready'):
                setup.setup(self.folder, background=True)
        self.assertIsNotNone(environment(self.folder))
        self.assertIsNone(settings(self.folder))
        self.assertEqual(self.store.verification(), before)

    def test_setup_check_is_read_only_and_optional_packages_do_not_block_app(self):
        checker = tool('check_setup')
        missing = self.root / 'not created'
        with patch.object(checker, 'probe', return_value={'error': 'Synthetic missing packages'}):
            result = checker.check(missing)
        self.assertTrue(result['appReady'])
        self.assertFalse(result['importsReady'])
        self.assertFalse(result['backgroundReady'])
        self.assertIn('--background', result['backgroundSetupCommand'])
        self.assertFalse(missing.exists())
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            checker.report(result)
        self.assertIn('nothing was installed or changed', output.getvalue())
        self.assertIn('Start the app once', output.getvalue())
        self.assertIn('optional', output.getvalue())


if __name__ == '__main__':
    unittest.main()
