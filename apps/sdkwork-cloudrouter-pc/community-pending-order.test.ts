import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clearPendingCircleOrder,
  readPendingCircleOrder,
  savePendingCircleOrder,
} from './packages/sdkwork-cloudrouter-pc-community/src/pendingOrder.ts';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: new MemoryStorage(),
});

test('round-trips a pending membership order with its tier and package', () => {
  savePendingCircleOrder('1001', {
    order: {
      orderId: 'order-1',
      orderNo: 'NO-1',
      amount: '9.90',
      cashierUrl: 'https://cashier.example/order-1',
    },
    tierId: 'tier-1',
    packageId: 'pkg-1',
    lifetime: true,
  });

  assert.deepEqual(readPendingCircleOrder('1001'), {
    order: {
      orderId: 'order-1',
      orderNo: 'NO-1',
      amount: '9.90',
      cashierUrl: 'https://cashier.example/order-1',
    },
    tierId: 'tier-1',
    packageId: 'pkg-1',
    lifetime: true,
  });

  clearPendingCircleOrder('1001');
  assert.equal(readPendingCircleOrder('1001'), null);
});

test('ignores malformed pending order payloads', () => {
  globalThis.sessionStorage.setItem(
    'cloudrouter.community.pendingOrder.1002',
    JSON.stringify({ order: { orderId: 'only-id' } }),
  );
  assert.equal(readPendingCircleOrder('1002'), null);

  globalThis.sessionStorage.setItem('cloudrouter.community.pendingOrder.1003', '{');
  assert.equal(readPendingCircleOrder('1003'), null);
});
