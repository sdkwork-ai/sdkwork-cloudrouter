import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveCashierExpiresAt } from '../packages/sdkwork-cloudrouter-pc-cashier/src/cashierExpiry.ts';

test('the provider attempt window wins when it closes before the order', () => {
  // Order payable for 30 minutes, provider trade (and anonymous capability)
  // capped at 15: the cashier must stop at the trade deadline, not the order's.
  const expiresAt = resolveCashierExpiresAt(
    '2026-07-27T04:30:00.000Z',
    '2026-07-27T04:15:00.000Z',
  );
  assert.equal(expiresAt, '2026-07-27T04:15:00.000Z');
});

test('the order window still wins when it closes first', () => {
  const expiresAt = resolveCashierExpiresAt(
    '2026-07-27T04:05:00.000Z',
    '2026-07-27T04:15:00.000Z',
  );
  assert.equal(expiresAt, '2026-07-27T04:05:00.000Z');
});

test('a session without an attempt window falls back to the order window', () => {
  // Sandbox trades and older responses carry no provider window.
  for (const attemptExpireTime of [undefined, '', 'not-a-timestamp']) {
    assert.equal(
      resolveCashierExpiresAt('2026-07-27T04:30:00.000Z', attemptExpireTime),
      '2026-07-27T04:30:00.000Z',
    );
  }
});

test('an attempt window without an order window is still honoured', () => {
  assert.equal(
    resolveCashierExpiresAt(undefined, '2026-07-27T04:15:00.000Z'),
    '2026-07-27T04:15:00.000Z',
  );
});

test('an unusable pair yields no deadline instead of a fabricated one', () => {
  assert.equal(resolveCashierExpiresAt(undefined, undefined), undefined);
  assert.equal(resolveCashierExpiresAt('', ''), '');
});
