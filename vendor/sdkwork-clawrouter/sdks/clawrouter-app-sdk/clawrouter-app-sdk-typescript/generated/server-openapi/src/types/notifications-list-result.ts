import type { NotificationListResponse } from './notification-list-response';

/** Notifications list result schema exposed by Claw Router. */
export interface NotificationsListResult {
  /** Business response code. */
  code: string;
  /** Data field on notifications list result. */
  data?: NotificationListResponse;
  /** Human-readable response message. */
  msg?: string;
}
