import type { RoutingApiKeyItem } from './routing-api-key-item';

/** Routing api keys response schema exposed by Claw Router. */
export interface RoutingApiKeysResponse {
  /** Items field on routing api keys response. */
  items: RoutingApiKeyItem[];
}
