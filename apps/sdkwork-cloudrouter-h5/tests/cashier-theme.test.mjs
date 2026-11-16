// Cashier theme regression: hardcoded light surfaces used to break dark mode.
//
// The cashier cards used `bg-white` while their text used semantic tokens
// (`text-text-main` / `text-text-sub`), which flip to a light color in dark
// mode. The result was white text on a white card. These checks keep every
// cashier surface on the semantic palette; only the QR quiet zone may remain
// white because scanners need a light background.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(testsRoot, '..');
const workspaceRoot = path.join(appRoot, '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

test('cashier surfaces use theme tokens instead of hardcoded white', () => {
  const anonymous = read('packages/sdkwork-cloudrouter-h5-orders/src/AnonymousCashierPage.tsx');
  assert.doesNotMatch(anonymous, /bg-white/);
  assert.match(anonymous, /bg-surface/);
  assert.match(anonymous, /bg-brand-fill/);
  assert.match(anonymous, /text-on-brand/);

  const entryError = read('packages/sdkwork-cloudrouter-h5-orders/src/CashierEntryErrorPage.tsx');
  assert.doesNotMatch(entryError, /bg-white/);
  assert.doesNotMatch(entryError, /bg-primary-blue/);
  assert.match(entryError, /bg-surface/);
  assert.match(entryError, /bg-brand-fill/);
  assert.match(entryError, /text-on-brand/);

  // The logged-in cashier lives in the order mobile package and is scanned by
  // the H5 Tailwind entry. Only the QR quiet zone keeps a white background.
  const loggedInCashier = fs.readFileSync(
    path.join(
      workspaceRoot,
      'sdkwork-order',
      'apps',
      'sdkwork-order-common',
      'packages',
      'sdkwork-order-mobile-react-orders',
      'src',
      'pages',
      'CashierPage.tsx',
    ),
    'utf8',
  );
  const whiteSurfaces = loggedInCashier.match(/bg-white/g) ?? [];
  assert.equal(whiteSurfaces.length, 1, 'only the QR quiet zone may stay white');
  assert.match(loggedInCashier, /qrDataUrl/);
  assert.doesNotMatch(loggedInCashier, /bg-primary-blue/);
  assert.match(loggedInCashier, /bg-brand-fill/);
  assert.match(loggedInCashier, /text-on-brand/);
});

test('the H5 theme exposes both light and dark semantic surfaces', () => {
  const css = read('src/index.css');
  assert.match(css, /--color-canvas:/);
  assert.match(css, /--color-surface:/);
  assert.match(css, /--color-brand-fill:/);
  assert.match(css, /--color-on-brand:/);
  assert.match(css, /:root\.dark/);
  assert.match(css, /prefers-color-scheme: dark/);
});
