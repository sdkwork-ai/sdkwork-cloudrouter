import type { MembershipsPlansCreateResult } from './memberships-plans-create-result';

export interface MembershipsPlansCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
