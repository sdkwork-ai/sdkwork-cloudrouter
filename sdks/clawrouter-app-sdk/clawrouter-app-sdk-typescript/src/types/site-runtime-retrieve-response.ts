import type { SiteRuntimeRetrieveResult } from './site-runtime-retrieve-result';

export interface SiteRuntimeRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
