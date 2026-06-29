import type { RechargesSettingsRetrieveResult } from './recharges-settings-retrieve-result';

export interface RechargesSettingsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
