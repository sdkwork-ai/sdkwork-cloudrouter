import type { AdminAnnouncementsResponse } from './admin-announcements-response';

/** Announcements list result schema exposed by Claw Router. */
export interface AnnouncementsListResult {
  /** Business response code. */
  code: string;
  /** Data field on announcements list result. */
  data?: AdminAnnouncementsResponse;
  /** Human-readable response message. */
  msg?: string;
}
