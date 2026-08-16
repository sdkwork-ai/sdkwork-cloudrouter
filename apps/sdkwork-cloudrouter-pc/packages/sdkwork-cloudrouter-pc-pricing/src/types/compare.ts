import type { OfficialPricingRate, PricingCategoryCode } from './pricing';

/** Stable identity of a model across the rate rows that reference it. */
export function compareKeyOf(rate: OfficialPricingRate): string {
  return `${rate.vendorCode}:${rate.resourceCode}`;
}

/** Model comparison type derived from the rate's category groups. */
export function rateCategory(rate: OfficialPricingRate): PricingCategoryCode {
  return rate.groupCodes.find((code) => code !== 'all') ?? 'other';
}

/** One deduplicated model row aggregating all of its rate records. */
export interface ModelGroup {
  key: string;
  category: PricingCategoryCode;
  rates: OfficialPricingRate[];
}

/**
 * Deduplicates the rate list by model (vendor + resource). A model can appear
 * in many rate rows (different operations/meters/regions); the pricing table
 * shows one row per model so selection maps 1:1 to a model.
 */
export function groupRatesByModel(items: readonly OfficialPricingRate[]): ModelGroup[] {
  const groups = new Map<string, ModelGroup>();
  for (const rate of items) {
    const key = compareKeyOf(rate);
    const existing = groups.get(key);
    if (existing) {
      existing.rates.push(rate);
    } else {
      groups.set(key, { key, category: rateCategory(rate), rates: [rate] });
    }
  }
  return [...groups.values()];
}
