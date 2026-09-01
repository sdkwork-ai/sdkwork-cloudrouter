/** Pricing default region create request schema exposed by Cloud Router. */
export interface PricingDefaultRegionCreateRequest {
  /** Catalog key field on pricing default region create request. */
  catalogKey: string;
  /** Currency code field on pricing default region create request. */
  currencyCode: string;
  /** Default region code field on pricing default region create request. */
  defaultRegionCode: string;
  /** Description field on pricing default region create request. */
  description?: string;
  /** Effective from field on pricing default region create request. */
  effectiveFrom?: string;
  /** Effective to field on pricing default region create request. */
  effectiveTo?: string;
  /** Product code field on pricing default region create request. */
  productCode: string;
  /** Resource code field on pricing default region create request. */
  resourceCode?: string;
  /** Vendor code field on pricing default region create request. */
  vendorCode: string;
  /** Provider code field on pricing default region create request. */
  providerCode?: string;
}
