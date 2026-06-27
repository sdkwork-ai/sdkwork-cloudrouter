/** Messaging provider account create request schema exposed by Claw Router. */
export interface MessagingProviderAccountCreateRequest {
  /** Account code field on messaging provider account create request. */
  accountCode: string;
  /** Account name field on messaging provider account create request. */
  accountName: string;
  /** Base url field on messaging provider account create request. */
  baseUrl?: string;
  /** Channel field on messaging provider account create request. */
  channel: string;
  /** Credential field on messaging provider account create request. */
  credential: Record<string, unknown>;
  /** Delivery purpose field on messaging provider account create request. */
  deliveryPurpose?: string;
  /** Provider code field on messaging provider account create request. */
  providerCode: string;
}
