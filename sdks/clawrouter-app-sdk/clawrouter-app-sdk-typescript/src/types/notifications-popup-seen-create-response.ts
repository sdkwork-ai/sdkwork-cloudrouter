import type { NotificationsPopupSeenCreateResult } from './notifications-popup-seen-create-result';

export interface NotificationsPopupSeenCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
