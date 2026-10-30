#!/usr/bin/env python3
"""Import assistant-prepared pieces and local photos. Preview by default; --apply saves atomically."""
import argparse
import contextlib
import json
import os
import sqlite3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from piece_import import KINDS, LAYER, VOCAB, import_batch, prepare_batch
from storage import Store
from assistant_import import check_setup, saved_status, finish_request, request_part
from import_sources import folder as source_folder, safe_file
from photo_environment import import_in_environment


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, help='Existing wardrobe data folder outside the app source')
    parser.add_argument('--file', type=Path, help='Import JSON, with image files inside the same folder')
    parser.add_argument('--apply', action='store_true', help='Save the validated batch; otherwise preview only')
    parser.add_argument('--duplicates', choices=('skip', 'add'), default='skip', help='Default skip; add is an explicit override')
    parser.add_argument('--promote-wishlist', action='store_true', help='Owned item with one wishlist match: change ownership only')
    parser.add_argument('--allow-no-photo', action='store_true', help='Explicitly permit pieces with no local image')
    parser.add_argument('--schema', action='store_true', help='Print the format, example and current vocabulary; no database needed')
    parser.add_argument('--expected-instance', help='Refuse a different wardrobe; supplied by the direct-import request')
    parser.add_argument('--batch-id', help='Batch ID for setup/result checks')
    parser.add_argument('--request-id', help='Stable import request shared by successive saved parts')
    parser.add_argument('--part', type=int, help='Preview/apply part N using part-N.json in this request folder')
    parser.add_argument('--cursor', default='', help='Short source progress, without private email or order details')
    parser.add_argument('--note', default='', help='Short explanation of remaining work or unresolved items')
    checks = parser.add_mutually_exclusive_group()
    checks.add_argument('--check', action='store_true', help='Verify local import readiness and record the setup check; imports nothing')
    checks.add_argument('--status', action='store_true', help='Read the saved result for this batch; changes nothing')
    checks.add_argument('--finish-request', choices=('complete', 'needs-input', 'paused'), help='Record the assistant-reported request outcome; totals still come from saved receipts')
    args = parser.parse_args(argv)
    try:
        if args.schema:
            result = {'format': 'closet-lint-import/v1', 'batchId': 'choose-a-stable-batch-id', 'pieces': [{'name': 'Example tee', 'category': 'Tops', 'subcategory': 'Tees', 'status': 'wishlist', 'size': '', 'retailer': '', 'url': '', 'price': None, 'date': '', 'dateApproximate': False, 'productPhotoRequested': False, 'photoNote': '', 'colors': [], 'images': [{'file': 'photos/tee.jpg', 'kind': 'isolated', 'sourceUrl': ''}]}], 'imageKinds': KINDS, 'layering': LAYER, 'vocabulary': VOCAB}
        else:
            if not args.data or (not args.file and args.part is None and not (args.check or args.status or args.finish_request)):
                raise ValueError('Use --data EXISTING_FOLDER --file IMPORT.json, or --schema')
            data = args.data.resolve()
            if data.is_relative_to(ROOT) or not (data / 'wardrobe.sqlite3').is_file():
                raise ValueError('Choose an existing wardrobe outside the source folder. Start the app once to create one; no new data folder is created by this command')
            with contextlib.closing(sqlite3.connect((data / 'wardrobe.sqlite3').as_uri() + '?mode=ro', uri=True)) as db:
                row = db.execute("SELECT payload FROM metadata WHERE key='instance'").fetchone()
                identity = json.loads(row[0]) if row else None
                if not isinstance(identity, str) or not identity:
                    raise ValueError('Choose a valid existing wardrobe; no new wardrobe was created.')
                if args.expected_instance is not None and identity != args.expected_instance:
                    raise ValueError('Wrong wardrobe. Return to the installation that prepared this request; nothing was imported.')
            if args.check or args.status:
                result = (check_setup if args.check else saved_status)(Store(data), args.expected_instance, args.batch_id)
                print(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2))
                return 0
            if args.finish_request:
                result = finish_request(Store(data), args.expected_instance, args.request_id, args.finish_request, args.note, args.cursor)
                print(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2))
                return 0
            if args.request_id is not None or args.part is not None:
                child = request_part(args.request_id, args.part)
                if args.file:
                    raise ValueError('For request parts, use part-N.json in the supplied request folder, without --file.')
                args.file = safe_file(source_folder(Store(data), args.expected_instance, args.request_id), 'part-' + str(args.part) + '.json')
            delegated = import_in_environment(data, list(argv) if argv is not None else sys.argv[1:])
            if delegated is not None:
                return delegated
            batch, digest, rows = prepare_batch(args.file, allow_no_photo=args.allow_no_photo)
            if args.request_id and batch != child:
                raise ValueError('The manifest batchId must be ' + child)
            os.umask(0o077)
            result = import_batch(Store(data), batch, digest, rows, apply=args.apply, duplicates=args.duplicates, promote_wishlist=args.promote_wishlist, expected_instance=args.expected_instance, request_id=args.request_id, part=args.part, cursor=args.cursor)
        print(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2))
        return 0
    except (ValueError, OSError, KeyError, TypeError, sqlite3.Error) as error:
        print(json.dumps({'ok': False, 'error': str(error)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
