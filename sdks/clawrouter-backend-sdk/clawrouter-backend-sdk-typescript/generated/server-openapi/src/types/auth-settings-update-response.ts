import type { AuthSettingsUpdateResult } from './auth-settings-update-result';

export interface AuthSettingsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
