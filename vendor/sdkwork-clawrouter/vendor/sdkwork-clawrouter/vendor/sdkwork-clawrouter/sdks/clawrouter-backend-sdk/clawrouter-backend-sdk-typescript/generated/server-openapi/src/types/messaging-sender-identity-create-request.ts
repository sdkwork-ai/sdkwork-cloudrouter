/** Messaging sender identity create request schema exposed by Claw Router. */
export interface MessagingSenderIdentityCreateRequest {
  /** Channel field on messaging sender identity create request. */
  channel: string;
  /** Display name field on messaging sender identity create request. */
  displayName?: string;
  /** From email field on messaging sender identity create request. */
  fromEmail?: string;
  /** From name field on messaging sender identity create request. */
  fromName?: string;
  /** Identity code field on messaging sender identity create request. */
  identityCode: string;
  /** Provider account id field on messaging sender identity create request. */
  providerAccountId: string;
  /** Sender id field on messaging sender identity create request. */
  senderId?: string;
  /** Sign name field on messaging sender identity create request. */
  signName?: string;
}
