import { describe, expect, it } from 'vitest';
import type { Model } from './data/models';
import { formatModelPriceValue, parseSaleMultiplier } from './pricing';
import {
  deriveModelCatalogPricingView,
  deriveModelCatalogRegionPricingView,
  modelCatalogRegions,
} from './modelCatalog';

function buildModel(overrides: Partial<Model> = {}): Model {
  return {
    id: 'gpt-5',
    modelId: 'gpt-5',
    vendorCode: 'openai',
    name: 'GPT-5',
    provider: 'OpenAI',
    modality: 'Text',
    context: '128k',
    groups: ['default'],
    categories: ['Recommended'],
    capabilities: ['Chat'],
    description: 'Catalog fixture model',
    latency: '0.5s',
    throughput: '100',
    pricing: {
      input: 1.25,
      output: 10,
      cachedInput: 0.125,
      unit: '1M tokens',
      currency: 'USD',
      status: 'reference',
      referencePrices: [
        { regionCode: 'global', billingMeter: 'llm_input_token', unitPrice: 1.25, currency: 'USD' },
        { regionCode: 'global', billingMeter: 'llm_output_token', unitPrice: 10, currency: 'USD' },
        { regionCode: 'global', billingMeter: 'llm_cache_read_token', unitPrice: 0.125, currency: 'USD' },
        { regionCode: 'cn', billingMeter: 'llm_input_token', unitPrice: 1.5, currency: 'CNY' },
        { regionCode: 'cn', billingMeter: 'llm_output_token', unitPrice: 12, currency: 'CNY' },
        { regionCode: 'cn', billingMeter: 'llm_cache_read_token', unitPrice: 0.2, currency: 'CNY' },
      ],
    },
    ...overrides,
  };
}

describe('parseSaleMultiplier', () => {
  it('parses a valid decimal multiplier', () => {
    expect(parseSaleMultiplier('1.5')).toBe(1.5);
    expect(parseSaleMultiplier(' 2 ')).toBe(2);
    expect(parseSaleMultiplier('1.25')).toBe(1.25);
  });

  it('rejects empty, malformed, and negative multipliers', () => {
    expect(parseSaleMultiplier('')).toBeNull();
    expect(parseSaleMultiplier('abc')).toBeNull();
    expect(parseSaleMultiplier('-1')).toBeNull();
    expect(parseSaleMultiplier('Infinity')).toBeNull();
    expect(parseSaleMultiplier(null)).toBeNull();
    expect(parseSaleMultiplier(undefined)).toBeNull();
  });
});

describe('formatModelPriceValue', () => {
  it('formats a reference (standard) price with a uniform 3-digit precision', () => {
    expect(formatModelPriceValue(1.25, 'USD')).toBe('$1.250');
    expect(formatModelPriceValue(0.05, 'USD')).toBe('$0.050');
    expect(formatModelPriceValue(10, 'USD')).toBe('$10.000');
  });

  it('scales price by the sale multiplier keeping the same precision', () => {
    expect(formatModelPriceValue(1.25, 'USD', { saleMultiplier: 1.5 })).toBe('$1.875');
    expect(formatModelPriceValue(2, 'USD', { saleMultiplier: 1.5 })).toBe('$3.000');
    // Standard and sale prices share the same trailing-digit count.
    expect(formatModelPriceValue(1.25, 'USD')).toBe('$1.250');
  });

  it('keeps zero multiplier semantics stable', () => {
    // scaled value 0 keeps the uniform 3-digit precision.
    expect(formatModelPriceValue(1.25, 'USD', { saleMultiplier: 0 })).toBe('$0.000');
  });
});

describe('modelCatalogRegions', () => {
  const model = buildModel();

  it('derives unique, sorted regions from referencePrices (global first)', () => {
    expect(modelCatalogRegions(model).map((region) => region.regionCode)).toEqual(['global', 'cn']);
  });

  it('exposes an i18n labelKey with a fallback label', () => {
    const regions = modelCatalogRegions(model);
    const global = regions.find((region) => region.regionCode === 'global');
    const cn = regions.find((region) => region.regionCode === 'cn');
    expect(global?.labelKey).toBe('models.region.global');
    expect(global?.fallbackLabel).toBe('Global');
    expect(cn?.labelKey).toBe('models.region.cn');
  });

  it('deduplicates the same region across meters and casing', () => {
    const modelWithBothMetersInCn = buildModel();
    modelWithBothMetersInCn.pricing.referencePrices!.push({
      regionCode: 'CN',
      billingMeter: 'llm_input_token',
      unitPrice: 1.6,
      currency: 'CNY',
    });
    expect(modelCatalogRegions(modelWithBothMetersInCn).map((region) => region.regionCode)).toEqual(['global', 'cn']);
  });

  it('returns no regions when there are no reference prices', () => {
    const none = buildModel();
    none.pricing.referencePrices = undefined;
    expect(modelCatalogRegions(none)).toEqual([]);
  });
});

describe('deriveModelCatalogRegionPricingView', () => {
  const model = buildModel();

  it('returns null for a region without reference prices', () => {
    expect(deriveModelCatalogRegionPricingView(model, 'eu')).toBeNull();
  });

  it('derives a token layout with region prices for a text model', () => {
    const view = deriveModelCatalogRegionPricingView(model, 'global')!;
    expect(view).not.toBeNull();
    expect(view.layout).toBe('token');
    expect(view.cells.map((cell) => cell.key)).toEqual(['input', 'output', 'cachedInput']);
    expect(view.badgeLabel.length).toBeGreaterThan(0);
    const input = view.cells.find((cell) => cell.key === 'input');
    expect(input?.value).toBe(formatModelPriceValue(1.25, 'USD'));
    expect(input?.unavailable).toBe(false);
  });

  it('uses the region currency and price for the selected region', () => {
    const view = deriveModelCatalogRegionPricingView(model, 'cn')!;
    const input = view.cells.find((cell) => cell.key === 'input');
    expect(input?.value).toBe(formatModelPriceValue(1.5, 'CNY'));
  });

  it('applies the sale multiplier when provided', () => {
    const view = deriveModelCatalogRegionPricingView(model, 'global', { saleMultiplier: '1.5' })!;
    const input = view.cells.find((cell) => cell.key === 'input');
    expect(input?.value).toBe(formatModelPriceValue(1.25, 'USD', { saleMultiplier: 1.5 }));
  });
});

describe('deriveModelCatalogPricingView', () => {
  const model = buildModel();

  it('keeps its prior contract for a text model without a multiplier', () => {
    const view = deriveModelCatalogPricingView(model);
    expect(view.layout).toBe('token');
    expect(view.cells.map((cell) => cell.key)).toEqual(['input', 'output', 'cachedInput']);
    const input = view.cells.find((cell) => cell.key === 'input');
    expect(input?.value).toBe(formatModelPriceValue(model.pricing.input, model.pricing.currency));
  });

  it('scales to a sale price when a multiplier is present', () => {
    const view = deriveModelCatalogPricingView(model, { saleMultiplier: '2' });
    const input = view.cells.find((cell) => cell.key === 'input');
    expect(input?.value).toBe(formatModelPriceValue(1.25, 'USD', { saleMultiplier: 2 }));
  });

  it('uses a flat layout for non-text models', () => {
    const image = buildModel({ modality: 'Image' });
    const view = deriveModelCatalogPricingView(image, { saleMultiplier: '1.25' });
    expect(view.layout).toBe('flat');
    expect(view.cells).toHaveLength(1);
    expect(view.cells[0].key).toBe('flatPrice');
    expect(view.cells[0].unavailable).toBe(false);
  });
});