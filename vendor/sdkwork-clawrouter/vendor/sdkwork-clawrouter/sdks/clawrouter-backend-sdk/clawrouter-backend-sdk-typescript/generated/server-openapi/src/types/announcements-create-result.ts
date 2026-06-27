import type { AdminAnnouncementMutationResponse } from './admin-announcement-mutation-response';

/** Announcements create result schema exposed by Claw Router. */
export interface AnnouncementsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on announcements create result. */
  data?: AdminAnnouncementMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
