import type { UsersSettingsUpdateResult } from './users-settings-update-result';

export interface UsersSettingsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
