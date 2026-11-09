#!/usr/bin/env python3
"""Embed Profile, almanac and the pinned astronomy dependency in the portable app."""
from pathlib import Path
import argparse
ROOT=Path(__file__).resolve().parents[1]
def synced(text):
    for name,paths,anchor in [('PROFILE STYLES',['app/styles/profile.css','app/styles/comfort-zone.css','app/styles/comfort-quizzes.css'],'</style>'),('PROFILE',['app/vendor/astronomy-2.1.19.js','app/scripts/almanac.js','app/scripts/profile.js','app/scripts/comfort-zone.js','app/scripts/comfort-quizzes-catalog.js','app/scripts/comfort-quizzes-model.js','app/scripts/comfort-quiz-photos.js','app/scripts/comfort-quizzes-ui.js','app/scripts/comfort-quizzes-integration.js'],'/* BEGIN NAVIGATION (source: app/scripts/navigation.js) */')]:
        start=f'/* BEGIN {name} */\n';end=f'/* END {name} */'
        if start not in text:text=text.replace(anchor,start+end+'\n'+anchor,1)
        a=text.index(start)+len(start);b=text.index(end,a)
        text=text[:a]+'\n'.join((ROOT/p).read_text() for p in paths)+'\n'+text[b:]
    return text
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    p=ROOT/'app/closet-lint.html';s=p.read_text();out=synced(s)
    if args.check:
        if out!=s:raise SystemExit('Run python3 tools/sync_profile.py')
    else:p.write_text(out)
