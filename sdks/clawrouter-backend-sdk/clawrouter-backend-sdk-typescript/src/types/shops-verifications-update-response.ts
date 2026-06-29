import type { ShopsVerificationsUpdateResult } from './shops-verifications-update-result';

export interface ShopsVerificationsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
