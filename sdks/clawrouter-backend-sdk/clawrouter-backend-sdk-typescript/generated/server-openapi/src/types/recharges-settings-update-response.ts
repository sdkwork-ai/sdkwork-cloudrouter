import type { RechargesSettingsUpdateResult } from './recharges-settings-update-result';

export interface RechargesSettingsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
