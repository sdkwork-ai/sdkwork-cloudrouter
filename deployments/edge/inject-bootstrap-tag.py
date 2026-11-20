#!/usr/bin/env python3
"""Idempotently add the trusted-host-channel bootstrap script tag to the served
Cloud Router portal shells (release cloud profile)."""
import os
TAG = '<script src="/__sdkwork/credential-entry-bootstrap.js"></script>'
for arch in ('pc', 'h5'):
    path = f'/usr/share/sdkwork/router/web/{arch}/index.html'
    if not os.path.exists(path):
        continue
    with open(path, encoding='utf-8') as handle:
        html = handle.read()
    if TAG in html:
        print(f'{path}: bootstrap tag present')
        continue
    index = html.find('<head>')
    if index < 0:
        raise SystemExit(f'{path}: <head> missing')
    index += len('<head>')
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(html[:index] + '\n    ' + TAG + html[index:])
    print(f'{path}: bootstrap tag injected')
