import type { MembershipsPlansUpdateResult } from './memberships-plans-update-result';

export interface MembershipsPlansUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
