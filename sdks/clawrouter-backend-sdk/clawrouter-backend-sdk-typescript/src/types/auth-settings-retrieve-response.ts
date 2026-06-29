import type { AuthSettingsRetrieveResult } from './auth-settings-retrieve-result';

export interface AuthSettingsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
