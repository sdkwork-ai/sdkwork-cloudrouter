import type { OfficialPricingGroupFacet } from './official-pricing-group-facet';
import type { OfficialPricingMeterFacet } from './official-pricing-meter-facet';
import type { OfficialPricingRate } from './official-pricing-rate';
import type { OfficialPricingRegionFacet } from './official-pricing-region-facet';
import type { OfficialPricingValueFacet } from './official-pricing-value-facet';
import type { PageInfo } from './page-info';

/** Official pricing catalog response schema exposed by Cloud Router. */
export interface OfficialPricingCatalogResponse {
  /** Currencies field on official pricing catalog response. */
  currencies: OfficialPricingValueFacet[];
  /** Groups field on official pricing catalog response. */
  groups: OfficialPricingGroupFacet[];
  /** Items field on official pricing catalog response. */
  items: OfficialPricingRate[];
  /** Meters field on official pricing catalog response. */
  meters: OfficialPricingMeterFacet[];
  /** Page info field on official pricing catalog response. */
  pageInfo: PageInfo;
  /** Regions field on official pricing catalog response. */
  regions: OfficialPricingRegionFacet[];
  /** Vendors field on official pricing catalog response. */
  vendors: OfficialPricingValueFacet[];
}
