#!/usr/bin/env python3
"""Synchronize focused board sources into the portable app without changing load order."""
import argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCES=[('BOARD SESSION','scripts/board-session.js'),('BOARD EDITOR','scripts/board-editor.js'),('BOARD COLLAGE','scripts/board-collage.js'),('BOARD DESIGN','scripts/board-design.js'),('BOARD STYLES','styles/board.css')]
def synced(text):
    for name,source in SOURCES:
        start=f'/* BEGIN {name} (source: app/{source}) */\n'
        end=f'/* END {name} */'
        a=text.index(start)+len(start);b=text.index(end,a)
        text=text[:a]+(ROOT/'app'/source).read_text()+text[b:]
    return text
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    path=ROOT/'app/closet-lint.html';before=path.read_text();after=synced(before)
    if args.check:
        if before!=after:raise SystemExit('Board sources are out of sync; run python3 tools/sync_board.py')
    else:path.write_text(after)
