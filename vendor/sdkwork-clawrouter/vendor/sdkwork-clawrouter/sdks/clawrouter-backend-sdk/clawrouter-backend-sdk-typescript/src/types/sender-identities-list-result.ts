import type { MessagingSenderIdentityListResponse } from './messaging-sender-identity-list-response';

/** Sender identities list result schema exposed by Claw Router. */
export interface SenderIdentitiesListResult {
  /** Business response code. */
  code: string;
  /** Data field on sender identities list result. */
  data?: MessagingSenderIdentityListResponse;
  /** Human-readable response message. */
  msg?: string;
}
