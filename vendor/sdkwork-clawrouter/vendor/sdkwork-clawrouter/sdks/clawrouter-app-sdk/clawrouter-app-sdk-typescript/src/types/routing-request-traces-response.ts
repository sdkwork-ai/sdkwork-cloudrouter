import type { RoutingRequestTraceItem } from './routing-request-trace-item';

/** Routing request traces response schema exposed by Claw Router. */
export interface RoutingRequestTracesResponse {
  /** Items field on routing request traces response. */
  items: RoutingRequestTraceItem[];
}
