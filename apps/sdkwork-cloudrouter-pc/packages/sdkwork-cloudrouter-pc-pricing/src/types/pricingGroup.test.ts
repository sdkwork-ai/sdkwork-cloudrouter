import { describe, expect, it } from 'vitest';
import {
  buildPricingGroupRateMatcher,
  buildPricingGroupTagFacets,
  EMPTY_PRICING_GROUP_SELECTION,
  filterPricingGroups,
  hasPricingGroupSelection,
  pricingGroupHasTags,
  pricingGroupMatchesRate,
  pricingGroupMultiplier,
  pricingGroupsServingRates,
  resolveSelectedPricingGroups,
  toggleSelectionValue,
  type PricingGroupOption,
} from './pricingGroup';
import type { OfficialPricingRate } from './pricing';

function group(overrides: Partial<PricingGroupOption> = {}): PricingGroupOption {
  return {
    code: 'openai.text',
    name: 'OpenAI Text',
    tags: ['stable'],
    vendorCode: 'openai',
    modalities: ['text'],
    ...overrides,
  };
}

function rate(groupCodes: string[], overrides: Partial<OfficialPricingRate> = {}): OfficialPricingRate {
  return { groupCodes, vendorCode: 'openai', resourceCode: 'gpt-5', ...overrides } as OfficialPricingRate;
}

describe('pricing group tag filters', () => {
  it('counts groups per tag and orders facets by count', () => {
    const facets = buildPricingGroupTagFacets([
      group({ code: 'a', tags: ['stable', 'hot'] }),
      group({ code: 'b', tags: ['stable'] }),
      group({ code: 'c', tags: ['stable', 'hot'] }),
    ]);
    expect(facets).toEqual([
      { code: 'stable', count: 3 },
      { code: 'hot', count: 2 },
    ]);
  });

  it('matches groups by every selected tag (AND semantics)', () => {
    expect(pricingGroupHasTags({ tags: ['stable', 'hot'] }, ['stable'])).toBe(true);
    expect(pricingGroupHasTags({ tags: ['stable'] }, ['stable', 'hot'])).toBe(false);
    expect(pricingGroupHasTags({ tags: [] }, [])).toBe(true);
  });

  it('filters groups by tags and free-text query over name, code and tags', () => {
    const groups = [
      group({ code: 'openai.text', name: 'OpenAI 文本', tags: ['stable'] }),
      group({ code: 'openai.image', name: 'OpenAI 图片', tags: ['beta'] }),
    ];
    expect(filterPricingGroups(groups, '', ['stable']).map((item) => item.code)).toEqual(['openai.text']);
    expect(filterPricingGroups(groups, '图片', []).map((item) => item.code)).toEqual(['openai.image']);
    expect(filterPricingGroups(groups, 'beta', []).map((item) => item.code)).toEqual(['openai.image']);
  });

  it('narrows tagged groups by explicit group codes', () => {
    const groups = [
      group({ code: 'a', tags: ['stable'] }),
      group({ code: 'b', tags: ['stable'] }),
      group({ code: 'c', tags: ['beta'] }),
    ];
    expect(resolveSelectedPricingGroups(groups, { tags: [], groupCodes: [] })).toHaveLength(3);
    expect(resolveSelectedPricingGroups(groups, { tags: ['stable'], groupCodes: [] })).toHaveLength(2);
    expect(resolveSelectedPricingGroups(groups, { tags: ['stable'], groupCodes: ['b', 'c'] })).toEqual([
      groups[1],
    ]);
  });

  it('toggles multi-select values immutably', () => {
    expect(toggleSelectionValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleSelectionValue(['a', 'b'], 'a')).toEqual(['b']);
    const source = ['a'];
    toggleSelectionValue(source, 'b');
    expect(source).toEqual(['a']);
  });
});

describe('pricing group rate matching', () => {
  it('matches by vendor and modality-derived price category', () => {
    const openaiText = group();
    expect(pricingGroupMatchesRate(openaiText, rate(['all', 'llm']))).toBe(true);
    expect(pricingGroupMatchesRate(openaiText, rate(['all', 'embedding']))).toBe(true);
    expect(pricingGroupMatchesRate(openaiText, rate(['all', 'image']))).toBe(false);
    expect(pricingGroupMatchesRate(openaiText, rate(['all', 'llm'], { vendorCode: 'anthropic' }))).toBe(false);
  });

  it('treats unrestricted groups as matching every rate', () => {
    const unrestricted = group({ vendorCode: '', modalities: [] });
    expect(pricingGroupMatchesRate(unrestricted, rate(['all', 'image'], { vendorCode: 'anthropic' }))).toBe(true);
  });

  it('keeps every rate when no group filter is selected', () => {
    const matcher = buildPricingGroupRateMatcher([group()], EMPTY_PRICING_GROUP_SELECTION);
    expect(hasPricingGroupSelection(EMPTY_PRICING_GROUP_SELECTION)).toBe(false);
    expect(matcher(rate(['all', 'image']))).toBe(true);
  });

  it('filters rates by tag-selected groups and returns an empty match when nothing fits', () => {
    const groups = [
      group({ code: 'openai.text', tags: ['stable'] }),
      group({ code: 'anthropic.text', tags: ['beta'], vendorCode: 'anthropic' }),
    ];
    const stableMatcher = buildPricingGroupRateMatcher(groups, { tags: ['stable'], groupCodes: [] });
    expect(stableMatcher(rate(['all', 'llm']))).toBe(true);
    expect(stableMatcher(rate(['all', 'llm'], { vendorCode: 'anthropic' }))).toBe(false);

    const emptyMatcher = buildPricingGroupRateMatcher(groups, { tags: ['promotion'], groupCodes: [] });
    expect(emptyMatcher(rate(['all', 'llm']))).toBe(false);
  });
});

describe('pricing group price columns', () => {
  it('defaults a missing sale multiplier to 1.0', () => {
    expect(pricingGroupMultiplier(group({ saleMultiplier: undefined }))).toBe('1');
    expect(pricingGroupMultiplier(group({ saleMultiplier: '  ' }))).toBe('1');
    expect(pricingGroupMultiplier(group({ saleMultiplier: '0.08' }))).toBe('0.08');
  });

  it('lists only groups serving the model, ordered by multiplier then name', () => {
    const groups = [
      group({ code: 'full', name: 'Full price', saleMultiplier: '1' }),
      group({ code: 'promo', name: 'Promo', saleMultiplier: '0.5' }),
      group({ code: 'premium', name: 'Premium', saleMultiplier: '1.5' }),
      group({ code: 'foreign', name: 'Foreign', vendorCode: 'anthropic' }),
      group({ code: 'image-only', name: 'Image only', modalities: ['image'] }),
    ];
    expect(pricingGroupsServingRates(groups, [rate(['all', 'llm'])]).map((item) => item.code)).toEqual([
      'promo',
      'full',
      'premium',
    ]);
  });

  it('returns no columns when no group serves the rates', () => {
    const groups = [group({ code: 'image-only', modalities: ['image'] })];
    expect(pricingGroupsServingRates(groups, [rate(['all', 'llm'])])).toEqual([]);
  });
});
