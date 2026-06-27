import type { NotificationItem } from './notification-item';

/** Notification list response schema exposed by Claw Router. */
export interface NotificationListResponse {
  /** Items field on notification list response. */
  items: NotificationItem[];
}
