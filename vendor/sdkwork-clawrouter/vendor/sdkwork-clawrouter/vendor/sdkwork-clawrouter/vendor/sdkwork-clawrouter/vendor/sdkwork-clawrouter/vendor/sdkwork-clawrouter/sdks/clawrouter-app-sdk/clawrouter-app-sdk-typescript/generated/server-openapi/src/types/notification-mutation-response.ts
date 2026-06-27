/** Notification mutation response schema exposed by Claw Router. */
export interface NotificationMutationResponse {
  /** State field on notification mutation response. */
  state: 'acknowledged' | 'popup_seen';
  /** Updated field on notification mutation response. */
  updated: boolean;
}
