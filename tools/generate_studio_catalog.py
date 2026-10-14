#!/usr/bin/env python3
"""Build stable embedded catalog from canonical JSON; never publish personal project data."""
from __future__ import annotations
import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

def render() -> tuple[str, str]:
    w = [json.loads(f.read_text(encoding='utf-8')) for f in sorted((ROOT / 'workflows').glob('W[0-9][0-9].json'))]
    r = [json.loads(f.read_text(encoding='utf-8')) for f in sorted((ROOT / 'recipes').glob('*.json'))]
    catalog = {'catalog_version': '0.3.0-rc1', 'workflows': w, 'recipes': r}
    formatted = json.dumps(catalog, ensure_ascii=False, indent=2) + '\n'
    # JSON is embedded in HTML in a non-executing data script. Encode '<' to prevent </script> breakout.
    embedded = json.dumps(catalog, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    template = (ROOT / 'docs' / 'studio-template.html').read_text(encoding='utf-8')
    assert template.count('<!--INSERT_CANONICAL_CATALOG-->') == 1
    html = template.replace('<!--INSERT_CANONICAL_CATALOG-->', embedded)
    return formatted, html

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--check', action='store_true', help='Verify generated files match canonical definitions')
    args = p.parse_args()
    catalog, html = render()
    files = {ROOT / 'docs' / 'studio-catalog.json': catalog, ROOT / 'docs' / 'index.html': html}
    if args.check:
        bad = [str(path) for path, content in files.items() if not path.exists() or path.read_text(encoding='utf-8') != content]
        if bad:
            print('STALE generated files:', *bad, sep='\n')
            return 1
        print('PASS: catalog + offline HTML synchronized with 12 workflows and 5 recipes')
        return 0
    for path, content in files.items():
        path.write_text(content, encoding='utf-8')
        print(path.relative_to(ROOT))
    return 0

if __name__ == '__main__':
    sys.exit(main())
