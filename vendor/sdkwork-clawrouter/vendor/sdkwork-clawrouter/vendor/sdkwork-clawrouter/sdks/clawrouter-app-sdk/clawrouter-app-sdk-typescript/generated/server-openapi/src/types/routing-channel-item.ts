import type { JsonNull } from './json-null';
import type { RoutingCircuitBreakerPolicy } from './routing-circuit-breaker-policy';
import type { RoutingRetryPolicy } from './routing-retry-policy';

/** Routing channel item schema exposed by Claw Router. */
export interface RoutingChannelItem {
  /** Access type field on routing channel item. */
  accessType: string;
  /** Masked credential label from the selected upstream credential. Raw secret material is never returned. */
  apiKey: string;
  /** Balance field on routing channel item. */
  balance: string;
  /** Base url field on routing channel item. */
  baseUrl: string;
  /** Capabilities field on routing channel item. */
  capabilities: string[];
  /** Circuit breaker policy field on routing channel item. */
  circuitBreakerPolicy?: RoutingCircuitBreakerPolicy | JsonNull;
  /** Errors field on routing channel item. */
  errors: string;
  /** Id field on routing channel item. */
  id: string;
  /** Is multimodal field on routing channel item. */
  isMultimodal: boolean;
  /** Latency field on routing channel item. */
  latency: string;
  /** Models field on routing channel item. */
  models: string[];
  /** Name field on routing channel item. */
  name: string;
  /** Protocol field on routing channel item. */
  protocol: string;
  /** Provider field on routing channel item. */
  provider: string;
  /** Provider code field on routing channel item. */
  providerCode: string;
  /** Retry policy field on routing channel item. */
  retryPolicy?: RoutingRetryPolicy | JsonNull;
  /** Rpm field on routing channel item. */
  rpm: string;
  /** Status field on routing channel item. */
  status: string;
  /** Timeout ms field on routing channel item. */
  timeoutMs?: string | null;
  /** Vendor field on routing channel item. */
  vendor: string;
  /** Weight field on routing channel item. */
  weight: string;
}
