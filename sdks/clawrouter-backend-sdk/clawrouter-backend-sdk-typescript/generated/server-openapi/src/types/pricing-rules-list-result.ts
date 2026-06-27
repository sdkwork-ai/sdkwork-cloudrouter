import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Pricing rules list result schema exposed by Claw Router. */
export interface PricingRulesListResult {
  /** Business response code. */
  code: string;
  /** Data field on pricing rules list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
