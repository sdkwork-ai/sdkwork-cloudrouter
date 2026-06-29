import type { RechargesPackagesUpdateResult } from './recharges-packages-update-result';

export interface RechargesPackagesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
