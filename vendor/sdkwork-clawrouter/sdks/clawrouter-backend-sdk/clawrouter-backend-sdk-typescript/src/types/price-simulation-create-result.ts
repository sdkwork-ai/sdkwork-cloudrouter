import type { ServiceProviderPriceSimulationResponse } from './service-provider-price-simulation-response';

/** Price simulation create result schema exposed by Claw Router. */
export interface PriceSimulationCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on price simulation create result. */
  data?: ServiceProviderPriceSimulationResponse;
  /** Human-readable response message. */
  msg?: string;
}
