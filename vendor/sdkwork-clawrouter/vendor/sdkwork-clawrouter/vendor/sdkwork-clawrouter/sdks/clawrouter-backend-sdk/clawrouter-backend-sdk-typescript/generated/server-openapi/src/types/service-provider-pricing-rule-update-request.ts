/** Service provider pricing rule update request schema exposed by Claw Router. */
export interface ServiceProviderPricingRuleUpdateRequest {
  /** Minimum charge field on service provider pricing rule update request. */
  minimumCharge?: string;
  /** Priority field on service provider pricing rule update request. */
  priority?: number;
  /** Status field on service provider pricing rule update request. */
  status?: 'active' | 'inactive' | 'suspended';
  /** Unit price field on service provider pricing rule update request. */
  unitPrice?: string;
  /** Unit size field on service provider pricing rule update request. */
  unitSize?: string;
}
