import type { PaymentsProviderAccountsCreateResult } from './payments-provider-accounts-create-result';

export interface PaymentsProviderAccountsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
