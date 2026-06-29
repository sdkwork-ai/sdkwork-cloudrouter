import type { SiteUpdateResult } from './site-update-result';

export interface SiteUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
