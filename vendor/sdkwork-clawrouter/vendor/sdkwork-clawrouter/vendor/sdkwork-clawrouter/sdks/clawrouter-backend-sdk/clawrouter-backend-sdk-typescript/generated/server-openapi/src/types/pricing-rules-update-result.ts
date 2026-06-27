import type { ServiceProviderPricingRuleMutationResponse } from './service-provider-pricing-rule-mutation-response';

/** Pricing rules update result schema exposed by Claw Router. */
export interface PricingRulesUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on pricing rules update result. */
  data?: ServiceProviderPricingRuleMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
