import type { NotificationMutationResponse } from './notification-mutation-response';

/** Notifications popup seen create result schema exposed by Claw Router. */
export interface NotificationsPopupSeenCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on notifications popup seen create result. */
  data?: NotificationMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
