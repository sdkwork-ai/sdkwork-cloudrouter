/** Service provider price simulation request schema exposed by Claw Router. */
export interface ServiceProviderPriceSimulationRequest {
  /** Billing meter code field on service provider price simulation request. */
  billingMeterCode: string;
  /** Buyer provider id field on service provider price simulation request. */
  buyerProviderId: string;
  /** Catalog key field on service provider price simulation request. */
  catalogKey?: string;
  /** Model field on service provider price simulation request. */
  model?: string;
  /** Quantity field on service provider price simulation request. */
  quantity: string;
  /** Token kind field on service provider price simulation request. */
  tokenKind?: string;
}
