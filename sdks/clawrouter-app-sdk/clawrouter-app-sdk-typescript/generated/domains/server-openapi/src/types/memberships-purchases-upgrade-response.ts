import type { MembershipsPurchasesUpgradeResult } from './memberships-purchases-upgrade-result';

export interface MembershipsPurchasesUpgradeResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
