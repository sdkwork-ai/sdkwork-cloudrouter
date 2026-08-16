import { describe, expect, it } from 'vitest';
import { compareKeyOf, groupRatesByModel, rateCategory } from './compare';
import type { OfficialPricingRate } from './pricing';

function rate(groupCodes: string[], overrides: Partial<OfficialPricingRate> = {}): OfficialPricingRate {
  return { groupCodes, ...overrides } as OfficialPricingRate;
}

describe('pricing compare selection helpers', () => {
  it('derives a stable model identity from vendor and resource code', () => {
    expect(compareKeyOf({ vendorCode: 'openai', resourceCode: 'gpt-5' } as OfficialPricingRate)).toBe('openai:gpt-5');
    expect(compareKeyOf({ vendorCode: 'anthropic', resourceCode: 'claude-haiku-4-5' } as OfficialPricingRate)).toBe(
      'anthropic:claude-haiku-4-5',
    );
  });

  it('derives the comparison category from the first non-all group code', () => {
    expect(rateCategory(rate(['all', 'llm']))).toBe('llm');
    expect(rateCategory(rate(['all', 'image']))).toBe('image');
    expect(rateCategory(rate(['video']))).toBe('video');
    expect(rateCategory(rate(['all']))).toBe('other');
  });

  it('keeps distinct models of the same vendor separate', () => {
    expect(compareKeyOf({ vendorCode: 'openai', resourceCode: 'gpt-5' } as OfficialPricingRate)).not.toBe(
      compareKeyOf({ vendorCode: 'openai', resourceCode: 'gpt-5-mini' } as OfficialPricingRate),
    );
  });

  it('deduplicates rate rows by model while preserving rate details', () => {
    const items = [
      rate(['all', 'llm'], { vendorCode: 'openai', resourceCode: 'gpt-5', rateCode: 'a' }),
      rate(['all', 'llm'], { vendorCode: 'openai', resourceCode: 'gpt-5', rateCode: 'b' }),
      rate(['all', 'llm'], { vendorCode: 'anthropic', resourceCode: 'claude-haiku-4-5', rateCode: 'c' }),
    ];
    const groups = groupRatesByModel(items);
    expect(groups).toHaveLength(2);
    const openai = groups.find((group) => group.key === 'openai:gpt-5');
    expect(openai?.rates).toHaveLength(2);
    expect(openai?.category).toBe('llm');
    expect(groups[0].key).toBe('openai:gpt-5');
  });
});
