import type {
  OfficialPricingCatalogResponse,
  OfficialPricingFormula,
  OfficialPricingGroupFacet,
  OfficialPricingMeterFacet,
  OfficialPricingRate,
  OfficialPricingRateCondition,
  OfficialPricingRateTier,
  OfficialPricingRegionFacet,
  OfficialPricingValueFacet,
} from '@sdkwork/cloudrouter-app-sdk';

export const PRICING_CATEGORY_CODES = [
  'all',
  'llm',
  'image',
  'video',
  'audio',
  'music',
  'embedding',
  'sound',
  'api',
  'other',
] as const;

export type PricingCategoryCode = (typeof PRICING_CATEGORY_CODES)[number];

export type {
  OfficialPricingCatalogResponse,
  OfficialPricingFormula,
  OfficialPricingGroupFacet,
  OfficialPricingMeterFacet,
  OfficialPricingRate,
  OfficialPricingRateCondition,
  OfficialPricingRateTier,
  OfficialPricingRegionFacet,
  OfficialPricingValueFacet,
};

export interface PricingCatalogFilters {
  category: PricingCategoryCode;
  searchQuery?: string;
  vendorCode?: string;
  regionCode?: string;
  meterCode?: string;
  currencyCode?: string;
  page: number;
  pageSize: number;
}
