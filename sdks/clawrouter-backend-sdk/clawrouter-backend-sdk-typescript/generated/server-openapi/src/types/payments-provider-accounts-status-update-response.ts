import type { PaymentsProviderAccountsStatusUpdateResult } from './payments-provider-accounts-status-update-result';

export interface PaymentsProviderAccountsStatusUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
