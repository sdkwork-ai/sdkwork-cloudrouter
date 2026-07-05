import type { UsersSettingsRetrieveResult } from './users-settings-retrieve-result';

export interface UsersSettingsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
