import { describe, expect, it } from 'vitest';
import { formatCompactTokens, formatDecimal, isPricingFormula } from './PricingRateTable';

describe('pricing presentation helpers', () => {
  it('preserves decimal precision while removing display-only trailing zeros', () => {
    expect(formatDecimal('0.000001000000')).toBe('0.000001');
    expect(formatDecimal('1000000.000000')).toBe('1000000');
  });

  it('compacts token counts into readable magnitudes', () => {
    expect(formatCompactTokens('200000')).toBe('200K');
    expect(formatCompactTokens('64000')).toBe('64K');
    expect(formatCompactTokens('1000000')).toBe('1M');
    expect(formatCompactTokens('1500000')).toBe('1.5M');
    expect(formatCompactTokens('999')).toBe('999');
  });

  it('only accepts structured pricing formulas', () => {
    expect(isPricingFormula({ formulaCode: 'duration', terms: [] })).toBe(true);
    expect(isPricingFormula(null)).toBe(false);
  });
});
