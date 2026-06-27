/** Service provider pricing rule create request schema exposed by Claw Router. */
export interface ServiceProviderPricingRuleCreateRequest {
  /** Billing meter code field on service provider pricing rule create request. */
  billingMeterCode: string;
  /** Buyer provider id field on service provider pricing rule create request. */
  buyerProviderId: string;
  /** Catalog key field on service provider pricing rule create request. */
  catalogKey?: string;
  /** Currency field on service provider pricing rule create request. */
  currency?: string;
  /** Edge id field on service provider pricing rule create request. */
  edgeId?: string;
  /** Minimum charge field on service provider pricing rule create request. */
  minimumCharge: string;
  /** Model field on service provider pricing rule create request. */
  model?: string;
  /** Price plan id field on service provider pricing rule create request. */
  pricePlanId?: string;
  /** Priority field on service provider pricing rule create request. */
  priority?: number;
  /** Seller provider id field on service provider pricing rule create request. */
  sellerProviderId: string;
  /** Token kind field on service provider pricing rule create request. */
  tokenKind?: string;
  /** Unit price field on service provider pricing rule create request. */
  unitPrice: string;
  /** Unit size field on service provider pricing rule create request. */
  unitSize: string;
}
