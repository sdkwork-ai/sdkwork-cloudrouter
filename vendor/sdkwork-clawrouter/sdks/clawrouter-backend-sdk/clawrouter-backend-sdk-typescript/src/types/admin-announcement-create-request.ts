/** Admin announcement create request schema exposed by Claw Router. */
export interface AdminAnnouncementCreateRequest {
  /** Content field on admin announcement create request. */
  content: string;
  /** Show as popup field on admin announcement create request. */
  showAsPopup: boolean;
  /** Status field on admin announcement create request. */
  status: 'published' | 'draft';
  /** Target field on admin announcement create request. */
  target: 'all' | 'vip' | 'free' | 'beta';
  /** Title field on admin announcement create request. */
  title: string;
}
