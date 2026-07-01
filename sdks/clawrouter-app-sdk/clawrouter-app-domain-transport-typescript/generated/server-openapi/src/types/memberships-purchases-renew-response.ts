import type { MembershipsPurchasesRenewResult } from './memberships-purchases-renew-result';

export interface MembershipsPurchasesRenewResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
