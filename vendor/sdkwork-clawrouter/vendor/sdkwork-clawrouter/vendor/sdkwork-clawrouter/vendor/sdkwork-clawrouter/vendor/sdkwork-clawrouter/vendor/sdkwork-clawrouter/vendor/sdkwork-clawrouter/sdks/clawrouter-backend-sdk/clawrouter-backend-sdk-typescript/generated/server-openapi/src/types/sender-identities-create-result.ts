import type { MessagingSenderIdentityCreateResponse } from './messaging-sender-identity-create-response';

/** Sender identities create result schema exposed by Claw Router. */
export interface SenderIdentitiesCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on sender identities create result. */
  data?: MessagingSenderIdentityCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
