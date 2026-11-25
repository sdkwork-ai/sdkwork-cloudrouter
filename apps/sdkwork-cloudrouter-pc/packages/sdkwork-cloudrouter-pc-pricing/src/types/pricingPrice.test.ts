import { describe, expect, it } from 'vitest';
import { multiplyDecimalStrings, multiplyPriceByMultiplier, trimDecimalZeros } from './pricingPrice';

describe('exact decimal price multiplication', () => {
  it('multiplies decimal strings exactly instead of leaking float noise', () => {
    expect(multiplyDecimalStrings('0.004', '0.08')).toBe('0.00032');
    expect(multiplyDecimalStrings('54', '0.08')).toBe('4.32');
    expect(multiplyDecimalStrings('9', '1.5')).toBe('13.5');
    expect(multiplyDecimalStrings('0.000006', '0.35')).toBe('0.00000210');
    expect(multiplyDecimalStrings('2.5', '0.08')).toBe('0.200');
  });

  it('keeps zero products at zero regardless of scale', () => {
    expect(multiplyDecimalStrings('0', '0.5')).toBe('0');
    expect(multiplyDecimalStrings('0.000', '3')).toBe('0');
  });

  it('falls back to the original price when either side is not a decimal', () => {
    expect(multiplyDecimalStrings('abc', '2')).toBe('abc');
    expect(multiplyDecimalStrings('0.5', 'x')).toBe('0.5');
    expect(multiplyDecimalStrings('', '2')).toBe('');
  });

  it('trims display-only trailing zeros', () => {
    expect(trimDecimalZeros('0.000320')).toBe('0.00032');
    expect(trimDecimalZeros('1.000')).toBe('1');
    expect(trimDecimalZeros('1.0')).toBe('1');
    expect(trimDecimalZeros('10')).toBe('10');
    expect(trimDecimalZeros('0.000')).toBe('0');
  });
});

describe('multiplyPriceByMultiplier', () => {
  it('returns the official price untouched for a 1.0 multiplier', () => {
    expect(multiplyPriceByMultiplier('0.004000', '1')).toBe('0.004');
    expect(multiplyPriceByMultiplier('0.004', '1.0')).toBe('0.004');
    expect(multiplyPriceByMultiplier('0.004', undefined)).toBe('0.004');
    expect(multiplyPriceByMultiplier('54', '')).toBe('54');
  });

  it('derives the real sales price at the group multiplier', () => {
    expect(multiplyPriceByMultiplier('0.004', '0.08')).toBe('0.00032');
    expect(multiplyPriceByMultiplier('54', '0.08')).toBe('4.32');
    expect(multiplyPriceByMultiplier('54', '1.5')).toBe('81');
    expect(multiplyPriceByMultiplier('125.000000', '0.8')).toBe('100');
  });
});
