import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(
  join(
    appRoot,
    'packages',
    'sdkwork-cloudrouter-pc-cashier',
    'src',
    'cashierService.ts',
  ),
  'utf8',
);

test('one cashier session uses one idempotency key', () => {
  // A fresh key per createPayment call let a lost response plus a retry create a
  // second provider trade for the same order. The key must be minted once when
  // the driver (the cashier session) is created and reused by every retry.
  const keyIndex = source.indexOf('const paymentIdempotencyKey');
  const createIndex = source.indexOf('async createPayment');
  assert.ok(keyIndex > 0, 'the driver must derive its payment idempotency key');
  assert.ok(
    createIndex > keyIndex,
    'the key must be created before createPayment, not inside it',
  );
  assert.match(
    source,
    /idempotencyKey:\s*paymentIdempotencyKey/u,
    'createPayment must send the session key',
  );
  assert.doesNotMatch(
    source,
    /createIdempotencyParams\('cloudrouter-cashier-payment'\)/u,
    'createPayment must not mint a new random key per call',
  );
});

test('the session key is scoped to the order and the chosen method', () => {
  // Two orders (or two methods on one order) are different logical operations and
  // must not share a key; the prefix keeps server-side logs attributable.
  assert.match(
    source,
    /createIdempotencyParams\(`cloudrouter-cashier-payment:\$\{order\.id\}:\$\{paymentMethod\}`\)/u,
  );
});
