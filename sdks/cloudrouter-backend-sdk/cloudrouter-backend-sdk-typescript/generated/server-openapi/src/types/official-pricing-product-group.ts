import type { OfficialPricingRate } from './official-pricing-rate';

/** Official pricing product group schema exposed by Cloud Router. */
export interface OfficialPricingProductGroup {
  /** Catalog key field on official pricing product group. */
  catalogKey?: string | null;
  /** Currency code field on official pricing product group. */
  currencyCode: string;
  /** Group codes field on official pricing product group. */
  groupCodes: ('all' | 'llm' | 'image' | 'video' | 'audio' | 'music' | 'embedding' | 'sound' | 'api' | 'other')[];
  /** Group key field on official pricing product group. */
  groupKey: string;
  /** Price book code field on official pricing product group. */
  priceBookCode: string;
  /** Price book version field on official pricing product group. */
  priceBookVersion: string;
  /** Product code field on official pricing product group. */
  productCode: string;
  /** Product display name field on official pricing product group. */
  productDisplayName: string;
  /** Product kind field on official pricing product group. */
  productKind: string;
  /** Provider code field on official pricing product group. */
  providerCode: string;
  /** Rates field on official pricing product group. */
  rates: OfficialPricingRate[];
  /** Region code field on official pricing product group. */
  regionCode: string;
  /** Resource code field on official pricing product group. */
  resourceCode: string;
  /** Resource type field on official pricing product group. */
  resourceType: string;
  /** Vendor code field on official pricing product group. */
  vendorCode: string;
}
