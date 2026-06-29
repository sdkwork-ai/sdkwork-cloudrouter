import type { PaymentsProviderAccountsUpdateResult } from './payments-provider-accounts-update-result';

export interface PaymentsProviderAccountsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
