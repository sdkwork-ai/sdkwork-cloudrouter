import type { SiteCreateResult } from './site-create-result';

export interface SiteCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
