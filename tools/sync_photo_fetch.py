#!/usr/bin/env python3
"""Embed the shared bounded photo reader into the portable app."""
import argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def synced(text):
    start='/* BEGIN PHOTO FETCH (source: app/scripts/photo-fetch.js) */\n'
    end='/* END PHOTO FETCH */'
    if start not in text:
        anchor='/* BEGIN CLOSET ORACLE (source:'
        assert anchor in text
        text=text.replace(anchor,start+end+'\n'+anchor,1)
    a=text.index(start)+len(start);b=text.index(end,a)
    return text[:a]+(ROOT/'app/scripts/photo-fetch.js').read_text()+text[b:]
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    p=ROOT/'app/closet-lint.html';before=p.read_text();after=synced(before)
    if args.check:
        if before!=after:raise SystemExit('Photo reader is out of sync; run python3 tools/sync_photo_fetch.py')
    else:p.write_text(after)
