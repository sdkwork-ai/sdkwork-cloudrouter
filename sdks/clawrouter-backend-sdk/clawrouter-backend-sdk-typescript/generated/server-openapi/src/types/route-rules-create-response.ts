import type { RouteRulesCreateResult } from './route-rules-create-result';

export interface RouteRulesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
