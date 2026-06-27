import type { AdminAnnouncementItem } from './admin-announcement-item';

/** Admin announcements response schema exposed by Claw Router. */
export interface AdminAnnouncementsResponse {
  /** Items field on admin announcements response. */
  items: AdminAnnouncementItem[];
}
