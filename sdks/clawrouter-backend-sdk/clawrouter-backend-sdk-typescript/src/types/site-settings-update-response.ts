import type { SiteSettingsUpdateResult } from './site-settings-update-result';

export interface SiteSettingsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
