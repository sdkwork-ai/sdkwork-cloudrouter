/** Admin announcement update request schema exposed by Claw Router. */
export interface AdminAnnouncementUpdateRequest {
  /** Content field on admin announcement update request. */
  content?: string;
  /** Show as popup field on admin announcement update request. */
  showAsPopup?: boolean;
  /** Status field on admin announcement update request. */
  status?: 'published' | 'draft';
  /** Target field on admin announcement update request. */
  target?: 'all' | 'vip' | 'free' | 'beta';
  /** Title field on admin announcement update request. */
  title?: string;
}
