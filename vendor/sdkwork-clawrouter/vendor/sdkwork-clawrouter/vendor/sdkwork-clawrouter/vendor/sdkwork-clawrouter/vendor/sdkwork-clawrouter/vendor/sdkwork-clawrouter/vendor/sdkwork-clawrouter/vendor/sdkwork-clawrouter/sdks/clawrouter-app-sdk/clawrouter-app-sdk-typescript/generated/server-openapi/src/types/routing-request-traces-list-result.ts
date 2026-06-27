import type { RoutingRequestTracesResponse } from './routing-request-traces-response';

/** Routing request traces list result schema exposed by Claw Router. */
export interface RoutingRequestTracesListResult {
  /** Business response code. */
  code: string;
  /** Data field on routing request traces list result. */
  data?: RoutingRequestTracesResponse;
  /** Human-readable response message. */
  msg?: string;
}
