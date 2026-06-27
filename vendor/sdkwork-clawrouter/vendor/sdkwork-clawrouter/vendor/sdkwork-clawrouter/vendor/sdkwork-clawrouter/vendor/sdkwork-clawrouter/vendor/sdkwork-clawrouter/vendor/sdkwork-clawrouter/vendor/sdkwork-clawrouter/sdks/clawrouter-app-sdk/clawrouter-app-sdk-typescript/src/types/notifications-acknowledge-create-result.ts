import type { NotificationMutationResponse } from './notification-mutation-response';

/** Notifications acknowledge create result schema exposed by Claw Router. */
export interface NotificationsAcknowledgeCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on notifications acknowledge create result. */
  data?: NotificationMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
