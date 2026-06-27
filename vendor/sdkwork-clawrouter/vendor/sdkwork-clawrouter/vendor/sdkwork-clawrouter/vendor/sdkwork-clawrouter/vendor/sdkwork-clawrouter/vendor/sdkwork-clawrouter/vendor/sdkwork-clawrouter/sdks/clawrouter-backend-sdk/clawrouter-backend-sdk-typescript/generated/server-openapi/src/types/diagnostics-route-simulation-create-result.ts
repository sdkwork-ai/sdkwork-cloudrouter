import type { MessagingRouteSimulationResponse } from './messaging-route-simulation-response';

/** Diagnostics route simulation create result schema exposed by Claw Router. */
export interface DiagnosticsRouteSimulationCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on diagnostics route simulation create result. */
  data?: MessagingRouteSimulationResponse;
  /** Human-readable response message. */
  msg?: string;
}
