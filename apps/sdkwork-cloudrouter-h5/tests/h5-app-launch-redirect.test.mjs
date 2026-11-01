/**
 * Safety of the H5 hand-off page. `/auth/desktop/launch?redirectUrl=...` is
 * reachable by anyone, so the page must only follow native app surfaces
 * (custom scheme) and RFC 8252 loopback redirects; a web origin or a
 * `javascript:`/`data:`/`file:` URL would make it an open redirect.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { isSafeAppLaunchUrl } from '../src/app-auth/appAuthorizeEntry.ts';

test('accepts native app and loopback hand-offs', () => {
  assert.equal(
    isSafeAppLaunchUrl('birdcoder://auth/callback?code=abc&state=xyz'),
    true,
  );
  assert.equal(isSafeAppLaunchUrl('http://127.0.0.1:53682/callback?code=abc'), true);
  assert.equal(isSafeAppLaunchUrl('http://localhost:3000/callback'), true);
  assert.equal(isSafeAppLaunchUrl('http://[::1]:8080/callback'), true);
});

test('rejects web origins and scriptable destinations', () => {
  const unsafe = [
    'https://evil.example/phish',
    'http://evil.example/phish',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'vbscript:msgbox(1)',
    'about:blank',
    '//evil.example/callback',
    '',
    '   ',
    'not a url',
    'birdcoder:foo',
  ];
  for (const value of unsafe) {
    assert.equal(isSafeAppLaunchUrl(value), false, value);
  }
});

test('the launch page guards the redirectUrl it receives', () => {
  const source = readFileSync(
    new URL('../src/app-auth/AppAuthPages.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /isSafeAppLaunchUrl\(requestedRedirectUrl\)/u);
});
