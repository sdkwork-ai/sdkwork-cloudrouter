import type { ServiceProviderPricingRuleMutationResponse } from './service-provider-pricing-rule-mutation-response';

/** Pricing rules create result schema exposed by Claw Router. */
export interface PricingRulesCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on pricing rules create result. */
  data?: ServiceProviderPricingRuleMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
