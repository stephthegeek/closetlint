#!/usr/bin/env python3
"""Inspect the allowlisted public tree without reading private wardrobe folders."""
from build_release import inspect, selected_files

if __name__ == '__main__':
    files = selected_files()
    problems = inspect(files)
    if problems:
        raise SystemExit('\n'.join(problems))
    print(f'Public source: {len(files)} allowlisted files; embedded wardrobe empty; no built-in secret/path pattern matches.')
    print('Pattern checks are not proof that all secrets are absent. Also run Gitleaks before publication.')
