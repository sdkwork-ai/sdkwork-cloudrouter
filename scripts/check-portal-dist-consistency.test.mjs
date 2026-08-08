#!/usr/bin/env node

// Tests for scripts/check-portal-dist-consistency.mjs.
// Verifies that the checker detects missing hashed chunks (the
// JS-served-as-HTML regression) and accepts a consistent dist.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { collectAssetReferences, checkDistAt } from './check-portal-dist-consistency.mjs';

function makeFakeDist({ missing = [] } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'portal-dist-test-'));
  mkdirSync(path.join(root, 'assets'));
  const assets = ['index-a1b2c3.js', 'vendor-ui-sdk-d4e5f6.js', 'vendor-icons-g7h8i9.js'];
  writeFileSync(path.join(root, 'index.html'), [
    '<!doctype html><html><head>',
    '<script type="module" src="/runtime-env.js"></script>',
    '<script type="module" src="/assets/index-a1b2c3.js"></script>',
    '<script type="module" src="/assets/vendor-ui-sdk-d4e5f6.js"></script>',
    '<link rel="stylesheet" href="/assets/vendor-icons-g7h8i9.css">',
    '</head><body><div id="root"></div></body></html>',
  ].join(''));
  writeFileSync(path.join(root, 'assets', 'index-a1b2c3.js'), 'console.log(1);');
  writeFileSync(path.join(root, 'assets', 'vendor-ui-sdk-d4e5f6.js'), 'console.log(2);');
  writeFileSync(path.join(root, 'assets', 'vendor-icons-g7h8i9.css'), 'body{}');
  for (const name of missing) {
    rmSync(path.join(root, 'assets', name), { force: true });
  }
  return root;
}

test('collectAssetReferences extracts both static and runtime-served asset references', () => {
  const html = '<script src="/runtime-env.js"></script><script src="/assets/a.js"></script>';
  const references = collectAssetReferences(html);
  assert.deepEqual(references, ['/assets/a.js', '/runtime-env.js']);
});

test('consistent dist passes', () => {
  const root = makeFakeDist();
  try {
    const result = checkDistAt(root);
    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('dist with a missing hashed chunk fails with a rebuild message', () => {
  const root = makeFakeDist({ missing: ['index-a1b2c3.js'] });
  try {
    const result = checkDistAt(root);
    assert.equal(result.ok, false);
    assert.ok(
      result.issues.some((issue) => issue.includes('index-a1b2c3.js') && issue.includes('does not exist')),
      `expected missing-chunk issue, got: ${result.issues.join('; ')}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('dist without index.html fails', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'portal-dist-test-'));
  try {
    const result = checkDistAt(root);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.includes('index.html')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
