"""Container startup using the released local runtime and its request protections."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import signal
import sys
import threading

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'runtime'))
import server as runtime


class ContainerHandler(runtime.Handler):
    def do_GET(self):
        if self.path == '/healthz':
            if not self.allowed():
                self.send_data(403, {'error': 'Unrecognized browser request.'})
            else:
                self.send_data(200, {'ok': True})
        else:
            super().do_GET()


def configure_photos(folder):
    """Use the image's libraries and persistent model cache."""
    target = folder / 'photo-tools.json'
    expected = {'python': sys.executable, 'models': str(folder / 'photo-tools/models')}
    if target.exists() or target.is_symlink():
        if target.is_symlink() or json.loads(target.read_text()) != expected:
            raise ValueError('Photo configuration belongs to another installation. Use a new Docker volume and Restore backup to move your wardrobe.')
        return
    temporary = folder / ('.photo-tools-' + str(os.getpid()) + '.tmp')
    try:
        with temporary.open('x') as handle:
            handle.write(json.dumps(expected, indent=2) + '\n')
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


def prepare_models(folder):
    """Prepare both models once per startup, reusing verified persistent files."""
    import background_worker as worker
    home = folder / 'photo-tools/models'
    ready = True
    for model in worker.MODELS:
        cached = worker.model_path(home, model).is_file()
        print(('Checking saved' if cached else 'Downloading') + ' background removal model: ' + model, flush=True)
        try:
            worker.prepare(home, model)
        except (OSError, ValueError) as error:
            ready = False
            print('Background removal setup could not finish for ' + model + ': ' + str(error) +
                  '. The app remains usable. Check your connection and restart the container to retry.',
                  file=sys.stderr, flush=True)
    if ready:
        print('Background removal ready. Saved models will be reused on later starts.', flush=True)
    return ready


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=Path('/data'))
    parser.add_argument('--port', type=int, default=6684)
    args = parser.parse_args(argv)
    folder = args.data.resolve()
    if folder.is_relative_to(ROOT) or not 1 <= args.port <= 65535:
        parser.error('Choose a separate data folder and a valid port.')
    os.umask(0o077)
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    lock_path = folder / '.container.lock'
    if lock_path.is_symlink():
        raise ValueError('The wardrobe lock must be a regular file.')
    with lock_path.open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('Another container is using this wardrobe. Stop it before starting this one.') from None
        store = runtime.Store(folder)
        configure_photos(folder)
        checked = store.verification()
        if checked['integrity'] != 'ok':
            raise ValueError('Wardrobe integrity check failed; the app was not started.')
        runtime.Handler = ContainerHandler
        httpd = runtime.LocalServer(args.port, store, host='0.0.0.0')
        def stop(_signum, _frame):
            threading.Thread(target=httpd.shutdown, daemon=True).start()
        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        print('Closet Lint ready. Open http://localhost:' + str(args.port) + '/', flush=True)
        if os.environ.get('CLOSETLINT_PREPARE_MODELS', '0') == '1':
            threading.Thread(target=prepare_models, args=(folder,), daemon=True, name='photo-model-setup').start()
        try:
            httpd.serve_forever()
        finally:
            httpd.server_close()
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError) as error:
        print('Closet Lint could not start: ' + str(error), file=sys.stderr)
        sys.exit(2)
