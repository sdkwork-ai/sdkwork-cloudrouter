import type { OfficialPricingProductGroup } from './official-pricing-product-group';
import type { OfficialPricingProductGroupFacet } from './official-pricing-product-group-facet';
import type { OfficialPricingProductRegionFacet } from './official-pricing-product-region-facet';
import type { OfficialPricingProductVendorFacet } from './official-pricing-product-vendor-facet';
import type { PageInfo } from './page-info';

/** Official pricing product catalog response schema exposed by Cloud Router. */
export interface OfficialPricingProductCatalogResponse {
  /** Groups field on official pricing product catalog response. */
  groups: OfficialPricingProductGroupFacet[];
  /** Items field on official pricing product catalog response. */
  items: OfficialPricingProductGroup[];
  /** Page info field on official pricing product catalog response. */
  pageInfo: PageInfo;
  /** Regions field on official pricing product catalog response. */
  regions: OfficialPricingProductRegionFacet[];
  /** Vendors field on official pricing product catalog response. */
  vendors: OfficialPricingProductVendorFacet[];
}
