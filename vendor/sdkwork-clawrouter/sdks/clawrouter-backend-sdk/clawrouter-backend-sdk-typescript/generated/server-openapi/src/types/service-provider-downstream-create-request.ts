/** Service provider downstream create request schema exposed by Claw Router. */
export interface ServiceProviderDownstreamCreateRequest {
  /** Default currency field on service provider downstream create request. */
  defaultCurrency?: string;
  /** Default multiplier field on service provider downstream create request. */
  defaultMultiplier?: string;
  /** Display name field on service provider downstream create request. */
  displayName: string;
  /** Price plan code field on service provider downstream create request. */
  pricePlanCode?: string;
  /** Provider no field on service provider downstream create request. */
  providerNo: string;
  /** Provider type field on service provider downstream create request. */
  providerType?: string;
  /** Seller provider id field on service provider downstream create request. */
  sellerProviderId: string;
  /** Settlement mode field on service provider downstream create request. */
  settlementMode?: string;
}
