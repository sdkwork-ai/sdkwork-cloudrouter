import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeGrantAmount,
  defaultRechargeSettings,
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

test('defaultRechargeSettings initializes the 1 CNY = 10 points ratio', () => {
  const settings = defaultRechargeSettings();
  assert.equal(settings.baseCurrencyCode, 'CNY');
  assert.equal(settings.basePointsPerCny, '10');
  assert.equal(settings.currencyToCnyRates.CNY, '1');
  assert.equal(settings.currencyToCnyRates.USD, '7');
});

test('computeGrantAmount converts every currency to points from the base ratio', () => {
  const settings = defaultRechargeSettings();
  // The platform 500-point package is priced at 50.00 CNY: 50 x 1 x 10 = 500.
  assert.equal(computeGrantAmount('50.00', 'CNY', 0, settings), 500);
  // A USD package converts through the USD -> CNY rate first: 50 x 7 x 10.
  assert.equal(computeGrantAmount('50.00', 'USD', 0, settings), 3500);
  // The bonus is awarded in points, on top of the amount-derived grant.
  assert.equal(computeGrantAmount('50.00', 'CNY', 20, settings), 520);
  assert.equal(computeGrantAmount('0.05', 'CNY', 0, settings), 1);
});

test('computeGrantAmount never borrows the CNY rate for an unconfigured currency', () => {
  const settings = defaultRechargeSettings();
  assert.throws(() => computeGrantAmount('50.00', 'JPY', 0, settings), /missing currency-to-CNY/);
  assert.equal(safeComputeGrantAmount('50.00', 'JPY', 0, settings), 0);
  // A currency present in the settings map keeps working.
  const withEuro = normalizeRechargeSettings({
    baseCurrencyCode: 'CNY',
    basePointsPerCny: '10',
    currencyToCnyRates: { CNY: '1', USD: '7', EUR: '8' },
  });
  assert.equal(computeGrantAmount('10.00', 'EUR', 0, withEuro), 800);
});
