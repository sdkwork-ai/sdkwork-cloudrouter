/** Acknowledge notification response schema exposed by Cloud Router. */
export interface AcknowledgeNotificationResponse {
  /** State field on acknowledge notification response. */
  state: 'acknowledged';
  /** Updated field on acknowledge notification response. */
  updated: boolean;
}
