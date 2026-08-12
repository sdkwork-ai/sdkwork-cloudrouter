/** Update payment provider request schema exposed by Cloud Router. */
export interface UpdatePaymentProviderRequest {
  /** Display name field on update payment provider request. */
  displayName?: string;
  /** Display name i 18 n field on update payment provider request. */
  displayNameI18n?: Record<string, string>;
  /** Reason field on update payment provider request. */
  reason: string;
  /** Sort order field on update payment provider request. */
  sortOrder?: string;
  /** Status field on update payment provider request. */
  status?: string;
}
