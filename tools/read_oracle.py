#!/usr/bin/env python3
"""Print an explicitly prepared Oracle snapshot; never change wardrobe records."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from oracle_context import read_context


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', required=True)
    parser.add_argument('--expected-instance', required=True)
    parser.add_argument('--request', required=True)
    args = parser.parse_args()
    try:
        print(read_context(args.data, args.expected_instance, args.request))
    except Exception as error:
        parser.exit(1, 'Oracle context unavailable: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
