import type { MessagingProviderAccountListResponse } from './messaging-provider-account-list-response';

/** Provider accounts list result schema exposed by Claw Router. */
export interface ProviderAccountsListResult {
  /** Business response code. */
  code: string;
  /** Data field on provider accounts list result. */
  data?: MessagingProviderAccountListResponse;
  /** Human-readable response message. */
  msg?: string;
}
