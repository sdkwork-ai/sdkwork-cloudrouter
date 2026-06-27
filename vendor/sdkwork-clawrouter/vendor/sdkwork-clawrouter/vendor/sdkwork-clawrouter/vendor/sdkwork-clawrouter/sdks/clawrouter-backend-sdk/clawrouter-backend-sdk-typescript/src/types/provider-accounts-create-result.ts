import type { MessagingProviderAccountCreateResponse } from './messaging-provider-account-create-response';

/** Provider accounts create result schema exposed by Claw Router. */
export interface ProviderAccountsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on provider accounts create result. */
  data?: MessagingProviderAccountCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
