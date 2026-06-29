import type { RouteExplainCreateResult } from './route-explain-create-result';

export interface RouteExplainCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
