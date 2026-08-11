import assert from 'node:assert/strict';
import test from 'node:test';
import { computeDiscountedAmount } from './decimal.ts';

test('computeDiscountedAmount applies the discount rate percentage', () => {
  assert.equal(computeDiscountedAmount('10.00', 90), '9.00000000');
  assert.equal(computeDiscountedAmount('69.90', 85), '59.41500000');
});

test('computeDiscountedAmount keeps the original price at 100 percent', () => {
  assert.equal(computeDiscountedAmount('10.00', 100), '10.00000000');
  assert.equal(computeDiscountedAmount('69.90', 100), '69.90000000');
});

test('computeDiscountedAmount rounds half up on the divided remainder', () => {
  // 1.05 * 90 / 100 = 0.945 -> 0.95 (remainder 50 rounds up)
  assert.equal(computeDiscountedAmount('1.05', 90, 2), '0.95');
  // 1.04 * 90 / 100 = 0.936 -> 0.94 (remainder 60 rounds up)
  assert.equal(computeDiscountedAmount('1.04', 90, 2), '0.94');
  // 1.06 * 90 / 100 = 0.954 -> 0.95 (remainder 40 rounds down)
  assert.equal(computeDiscountedAmount('1.06', 90, 2), '0.95');
  // Eight-digit amounts exercise the remainder path at the default scale:
  // 1.00000005 * 90 / 100 = 0.900000045 -> 0.90000005
  assert.equal(computeDiscountedAmount('1.00000005', 90), '0.90000005');
  // 1.00000006 * 90 / 100 = 0.900000054 -> 0.90000005
  assert.equal(computeDiscountedAmount('1.00000006', 90), '0.90000005');
});

test('computeDiscountedAmount falls back to no discount for invalid percentages', () => {
  assert.equal(computeDiscountedAmount('10.00', 0), '10.00000000');
  assert.equal(computeDiscountedAmount('10.00', 101), '10.00000000');
  assert.equal(computeDiscountedAmount('10.00', 90.5), '10.00000000');
});

test('computeDiscountedAmount handles zero and non-numeric amounts', () => {
  assert.equal(computeDiscountedAmount('0.00', 90), '0.00000000');
  assert.equal(computeDiscountedAmount('not-a-number', 90), '0.00000000');
});

test('computeDiscountedAmount respects the requested digit scale', () => {
  assert.equal(computeDiscountedAmount('10.00', 90, 2), '9.00');
  assert.equal(computeDiscountedAmount('10.00', 90, 4), '9.0000');
});
