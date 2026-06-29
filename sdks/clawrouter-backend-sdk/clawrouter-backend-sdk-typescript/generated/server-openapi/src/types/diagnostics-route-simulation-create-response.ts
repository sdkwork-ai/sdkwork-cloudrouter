import type { DiagnosticsRouteSimulationCreateResult } from './diagnostics-route-simulation-create-result';

export interface DiagnosticsRouteSimulationCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
