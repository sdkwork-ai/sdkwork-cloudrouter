import type { RechargesSettingsManagementRetrieveResult } from './recharges-settings-management-retrieve-result';

export interface RechargesSettingsManagementRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
