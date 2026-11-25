import { describe, expect, it } from 'vitest';
import {
  orderVendorFacets,
  pricingFacetCount,
  resolveVendorFacetView,
  totalVendorFacetCount,
  VENDOR_FACET_VISIBLE_LIMIT,
} from './pricingVendor';
import type { OfficialPricingValueFacet } from './pricing';

function facet(code: string, count: string): OfficialPricingValueFacet {
  return { id: code, code, count };
}

const labels: Record<string, string> = {
  alibaba: '阿里云',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  zhipu: '智谱',
};

const displayName = (code: string) => labels[code] ?? code;

describe('pricing vendor facets', () => {
  it('parses facet counts defensively', () => {
    expect(pricingFacetCount(facet('a', '311'))).toBe(311);
    expect(pricingFacetCount(facet('a', '0'))).toBe(0);
    expect(pricingFacetCount(facet('a', 'n/a'))).toBe(0);
    expect(pricingFacetCount(facet('a', ''))).toBe(0);
  });

  it('orders vendors by count desc then display name', () => {
    const ordered = orderVendorFacets(
      [facet('zhipu', '12'), facet('openai', '311'), facet('anthropic', '145'), facet('alibaba', '0')],
      displayName,
    );
    expect(ordered.map((item) => item.code)).toEqual(['openai', 'anthropic', 'zhipu', 'alibaba']);
  });

  it('sums every vendor count for the all-vendors badge', () => {
    expect(totalVendorFacetCount([facet('a', '3'), facet('b', '4'), facet('c', 'bad')])).toBe(7);
    expect(totalVendorFacetCount([])).toBe(0);
  });

  it('keeps one row when collapsed and everything when expanded', () => {
    const ordered = Array.from({ length: VENDOR_FACET_VISIBLE_LIMIT + 5 }, (_, index) =>
      facet(`vendor-${index}`, String(100 - index)));
    const collapsed = resolveVendorFacetView(ordered, { expanded: false });
    expect(collapsed.visible).toHaveLength(VENDOR_FACET_VISIBLE_LIMIT);
    expect(collapsed.hiddenCount).toBe(5);
    const expanded = resolveVendorFacetView(ordered, { expanded: true });
    expect(expanded.visible).toHaveLength(ordered.length);
    expect(expanded.hiddenCount).toBe(0);
  });

  it('does not show a more link when every vendor already fits', () => {
    const view = resolveVendorFacetView([facet('a', '1'), facet('b', '2')], { expanded: false });
    expect(view.visible).toHaveLength(2);
    expect(view.hiddenCount).toBe(0);
  });

  it('pins a selected vendor that falls outside the collapsed row', () => {
    const ordered = Array.from({ length: VENDOR_FACET_VISIBLE_LIMIT + 3 }, (_, index) =>
      facet(`vendor-${index}`, String(100 - index)));
    const hiddenCode = ordered[ordered.length - 1].code;
    const view = resolveVendorFacetView(ordered, { expanded: false, selectedCode: hiddenCode });
    expect(view.visible[0].code).toBe(hiddenCode);
    expect(view.visible).toHaveLength(VENDOR_FACET_VISIBLE_LIMIT);
    expect(view.hiddenCount).toBe(3);
  });

  it('ignores an unknown selected code without changing the row', () => {
    const ordered = [facet('a', '2'), facet('b', '1')];
    const view = resolveVendorFacetView(ordered, { expanded: false, selectedCode: 'missing' });
    expect(view.visible.map((item) => item.code)).toEqual(['a', 'b']);
  });
});
