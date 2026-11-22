import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageRoot = join(
  appRoot,
  'packages',
  'sdkwork-cloudrouter-h5-orders',
  'src',
);

function read(name) {
  return readFileSync(join(packageRoot, name), 'utf8');
}

test('the anonymous cashier counts down the session capability deadline', () => {
  const page = read('AnonymousCashierPage.tsx');
  // The capability token, its short link and the provider trade all expire
  // before the order does. Counting down `expireTime` alone keeps a scannable
  // QR on screen while the exchange can only answer 404.
  assert.match(
    page,
    /view\.capabilityExpiresAt\s*\n?\s*\?\s*Date\.parse\(view\.capabilityExpiresAt\)/u,
    'must prefer the server-published capabilityExpiresAt',
  );
  assert.match(
    page,
    /:\s*view\.expireTime\s*\n?\s*\?\s*Date\.parse\(view\.expireTime\)/u,
    'must fall back to the order window for older responses',
  );
  assert.match(
    page,
    /Date\.now\(\)\s*\+\s*CASHIER_TTL_SECONDS\s*\*\s*1000/u,
    'must still cap an unusable pair at the capability TTL',
  );
});

test('the cashier loader carries the capability deadline from the server', () => {
  const loader = read('anonymousCashier.ts');
  // The generated SDK is rebuilt from the OpenAPI document, which now declares
  // capabilityExpiresAt; the local extension keeps the page typed until then.
  assert.match(loader, /capabilityExpiresAt\?: string/u);
  assert.match(loader, /AnonymousCashierView/u);
  assert.match(loader, /cashier\.retrieve\(token\)/u);
});
