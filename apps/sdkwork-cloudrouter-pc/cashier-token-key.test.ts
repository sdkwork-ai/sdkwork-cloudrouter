// Manual cashier signing-key input validation.
//
// The admin dialog must accept exactly what the payment backend accepts:
// trimmed 32–512 characters from the base64/hex-safe alphabet. Rejecting a
// valid key only blocks an operator; accepting an invalid one turns into a 400.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateCashierTokenKey } from './packages/sdkwork-cloudrouter-pc-admin-payments/src/components/CashierTokenKeyDialogs';

test('manual cashier key validation matches the backend boundaries', () => {
  assert.equal(validateCashierTokenKey(''), 'empty');
  assert.equal(validateCashierTokenKey('   '), 'empty');
  assert.equal(validateCashierTokenKey('a'.repeat(31)), 'too-short');
  assert.equal(validateCashierTokenKey('a'.repeat(32)), null);
  assert.equal(validateCashierTokenKey('a'.repeat(512)), null);
  assert.equal(validateCashierTokenKey('a'.repeat(513)), 'too-long');
  assert.equal(validateCashierTokenKey(`${'a'.repeat(31)}!`), 'charset');
  assert.equal(validateCashierTokenKey(`  ${'a'.repeat(32)}  `), null);
  assert.equal(validateCashierTokenKey('A1-_+/='.repeat(8)), null);
});
