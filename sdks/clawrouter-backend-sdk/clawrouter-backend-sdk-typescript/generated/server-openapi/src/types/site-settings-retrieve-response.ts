import type { SiteSettingsRetrieveResult } from './site-settings-retrieve-result';

export interface SiteSettingsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
