import type { RoutingApiKeysResponse } from './routing-api-keys-response';

/** Routing api keys list result schema exposed by Claw Router. */
export interface RoutingApiKeysListResult {
  /** Business response code. */
  code: string;
  /** Data field on routing api keys list result. */
  data?: RoutingApiKeysResponse;
  /** Human-readable response message. */
  msg?: string;
}
