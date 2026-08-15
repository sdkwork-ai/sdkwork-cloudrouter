import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDecimalString,
  normalizeRechargeSettings,
  safeComputeGrantAmount,
} from './recharge-math.ts';

test('normalizeDecimalString normalizes plain and trailing-zero decimals', () => {
  assert.equal(normalizeDecimalString('10', 6, '1'), '10');
  assert.equal(normalizeDecimalString('1.5000', 6, '1'), '1.5');
  assert.equal(normalizeDecimalString('007', 6, '1'), '7');
  assert.equal(normalizeDecimalString('0.50', 6, '1'), '0.5');
});

test('normalizeDecimalString accepts editing intermediates instead of throwing', () => {
  // The recharge-rate inputs must not crash the page mid-typing.
  assert.equal(normalizeDecimalString('.', 6, '1'), '0');
  assert.equal(normalizeDecimalString('1.', 6, '1'), '1');
  assert.equal(normalizeDecimalString('.5', 6, '1'), '0.5');
  assert.equal(normalizeDecimalString('', 6, '1'), '1');
});

test('normalizeDecimalString clamps the fraction to the configured scale', () => {
  assert.equal(normalizeDecimalString('1.1234567', 6, '1'), '1.123456');
  assert.equal(normalizeDecimalString('1.12345670', 6, '1'), '1.123456');
});

test('normalizeDecimalString strips grouping commas before validation', () => {
  assert.equal(normalizeDecimalString('1,5', 6, '1'), '15');
});

test('normalizeDecimalString still rejects truly invalid characters', () => {
  assert.throws(() => normalizeDecimalString('1.5.', 6, '1'), /decimal value is invalid/);
  assert.throws(() => normalizeDecimalString('abc', 6, '1'), /decimal value is invalid/);
});

test('normalizeRechargeSettings tolerates mid-typing rates and points', () => {
  const normalized = normalizeRechargeSettings({
    baseCurrencyCode: 'CNY',
    basePointsPerCny: '.',
    currencyToCnyRates: { CNY: '1', USD: '7' },
  });
  assert.equal(normalized.basePointsPerCny, '0');
  assert.equal(normalized.currencyToCnyRates.CNY, '1');
  assert.equal(normalized.currencyToCnyRates.USD, '7');
});

test('normalizeRechargeSettings tolerates incomplete per-currency rates', () => {
  const normalized = normalizeRechargeSettings({
    baseCurrencyCode: 'CNY',
    basePointsPerCny: '10',
    currencyToCnyRates: { CNY: '1', EUR: '1.' },
  });
  assert.equal(normalized.currencyToCnyRates.EUR, '1');
  // A mid-typing EUR rate of "." normalizes to zero without crashing.
  const zeroed = normalizeRechargeSettings({
    baseCurrencyCode: 'CNY',
    basePointsPerCny: '10',
    currencyToCnyRates: { CNY: '1', EUR: '.' },
  });
  assert.equal(zeroed.currencyToCnyRates.EUR, '0');
});

test('safeComputeGrantAmount stays non-throwing for mid-typing settings', () => {
  assert.equal(safeComputeGrantAmount('10', 'USD', 0, {
    baseCurrencyCode: 'CNY',
    basePointsPerCny: '10',
    currencyToCnyRates: { CNY: '1', USD: '.' },
  }), 0);
  assert.equal(safeComputeGrantAmount('10', 'USD', 0, {
    baseCurrencyCode: 'CNY',
    basePointsPerCny: '10',
    currencyToCnyRates: { CNY: '1', USD: '7' },
  }), 700);
});
