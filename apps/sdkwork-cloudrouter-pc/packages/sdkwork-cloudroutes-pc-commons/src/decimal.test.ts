import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeDiscountedAmount,
  pointsForConvertedCashAmount,
  pointsPerUnitRate,
} from './decimal.ts';

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

test('pointsForConvertedCashAmount converts cost x rate into micro-points', () => {
  // 0.000704 USD x 70 积分/USD = 0.049280 points = 49280 micro-points.
  assert.equal(pointsForConvertedCashAmount('0.000704', '70'), '49280');
  // Fractional rate: 20 USD x 75.5 = 1510 points = 1,510,000,000 micro.
  assert.equal(pointsForConvertedCashAmount('20.00', '75.5'), '1510000000');
});

test('pointsForConvertedCashAmount ceils fractional micro-points', () => {
  // 0.0000001 x 1e6 = 0.1 micro -> ceil = 1 micro.
  assert.equal(pointsForConvertedCashAmount('0.0000001', '1'), '1');
});

test('pointsForConvertedCashAmount returns zero for empty or invalid input', () => {
  assert.equal(pointsForConvertedCashAmount('0.00', '70'), '0');
  assert.equal(pointsForConvertedCashAmount('', '70'), '0');
  assert.equal(pointsForConvertedCashAmount('0.000704', '0'), '0');
  assert.equal(pointsForConvertedCashAmount('0.000704', 'NaN'), '0');
});

test('pointsPerUnitRate prefers the configured rate as an exact decimal string', () => {
  assert.equal(pointsPerUnitRate('6.960000000000', undefined, undefined), '6.960000000000');
  assert.equal(pointsPerUnitRate('70', undefined, undefined), '70');
});

test('pointsPerUnitRate derives the rate from ledger points over cost for legacy rows', () => {
  // 1.233600 points / 0.000704 USD = 1752.27... scaled to 12 decimals.
  const rate = pointsPerUnitRate('', NaN as unknown as string, '0.000704');
  assert.equal(rate, '0');
  // 0.049280 points = 49280 micro on cost 0.000704 -> rate = 70 scaled by 1e12.
  assert.equal(pointsPerUnitRate('', '49280', '0.000704'), '70.000000000000');
});

test('pointsPerUnitRate returns zero when no rate can be established', () => {
  assert.equal(pointsPerUnitRate('', '', '0'), '0');
  assert.equal(pointsPerUnitRate(undefined, undefined, undefined), '0');
});
