import type { ProviderAccountsCreateResult } from './provider-accounts-create-result';

export interface ProviderAccountsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
