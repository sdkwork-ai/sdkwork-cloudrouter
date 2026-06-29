import type { RechargesPackagesCreateResult } from './recharges-packages-create-result';

export interface RechargesPackagesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
