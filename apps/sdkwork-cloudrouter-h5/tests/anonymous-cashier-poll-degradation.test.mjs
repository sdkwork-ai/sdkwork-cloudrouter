import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const page = readFileSync(
  join(
    appRoot,
    'packages',
    'sdkwork-cloudrouter-h5-orders',
    'src',
    'AnonymousCashierPage.tsx',
  ),
  'utf8',
);

test('a failing status poll stops being silent for the payer', () => {
  // A swallowed poll error makes a dying connection look like a payment that is
  // simply waiting; after a few consecutive failures the page must say so.
  assert.match(page, /const STATUS_POLL_DEGRADED_THRESHOLD = 3;/u);
  assert.match(page, /pollFailuresRef\.current \+= 1;/u);
  assert.match(page, /setStatusDegraded\(true\);/u);
  assert.match(page, /orders\.cashier_status_degraded/u);
});

test('a successful poll clears the degradation', () => {
  // The notice must not outlive the outage.
  const successPath = page.slice(
    page.indexOf('const status = await loadAnonymousCashierStatus(token);'),
    page.indexOf('if (status.paid'),
  );
  assert.match(successPath, /pollFailuresRef\.current = 0;/u);
  assert.match(successPath, /setStatusDegraded\(false\);/u);
});
