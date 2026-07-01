import type { MembershipsPurchasesCreateResult } from './memberships-purchases-create-result';

export interface MembershipsPurchasesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
