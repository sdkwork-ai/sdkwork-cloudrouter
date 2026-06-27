/** Admin announcement item schema exposed by Claw Router. */
export interface AdminAnnouncementItem {
  /** Content field on admin announcement item. */
  content: string;
  /** Date field on admin announcement item. */
  date: string;
  /** Id field on admin announcement item. */
  id: string;
  /** Show as popup field on admin announcement item. */
  showAsPopup: boolean;
  /** Status field on admin announcement item. */
  status: 'published' | 'draft';
  /** Target field on admin announcement item. */
  target: 'all' | 'vip' | 'free' | 'beta';
  /** Title field on admin announcement item. */
  title: string;
}
