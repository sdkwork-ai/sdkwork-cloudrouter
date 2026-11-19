import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isPaidCircleOrderStatus } from './packages/sdkwork-cloudrouter-pc-community/src/orderStatus.ts';

test('accepts every settled order status sdkwork-order can emit', () => {
  for (const status of ['paid', 'succeeded', 'success', 'completed', 'fulfilled', 'finished']) {
    assert.equal(isPaidCircleOrderStatus(status), true, status);
    assert.equal(isPaidCircleOrderStatus(status.toUpperCase()), true, status);
    assert.equal(isPaidCircleOrderStatus(` ${status} `), true, status);
  }
});

test('rejects unpaid and unknown statuses', () => {
  for (const status of ['pending', 'created', 'processing', 'cancelled', 'failed', '']) {
    assert.equal(isPaidCircleOrderStatus(status), false, status);
  }
});
