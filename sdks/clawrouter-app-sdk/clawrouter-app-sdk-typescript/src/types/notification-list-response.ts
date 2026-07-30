import type { NotificationItem } from './notification-item';
import type { PageInfo } from './page-info';

/** Notification list response schema exposed by Claw Router. */
export interface NotificationListResponse {
  /** Items field on notification list response. */
  items: NotificationItem[];
  /** Page info field on notification list response. */
  pageInfo: PageInfo;
}
