/** Notification item schema exposed by Claw Router. */
export interface NotificationItem {
  /** Action url field on notification item. */
  actionUrl?: string | null;
  /** App id field on notification item. */
  appId: string;
  /** Archived field on notification item. */
  archived: boolean;
  /** Content field on notification item. */
  content: string;
  /** Desc field on notification item. */
  desc: string;
  /** Id field on notification item. */
  id: string;
  /** Popup seen field on notification item. */
  popupSeen: boolean;
  /** Read field on notification item. */
  read: boolean;
  /** Show as popup field on notification item. */
  showAsPopup: boolean;
  /** Time field on notification item. */
  time: string;
  /** Title field on notification item. */
  title: string;
  /** Type field on notification item. */
  type: 'info' | 'billing' | 'warning' | 'alert';
}
