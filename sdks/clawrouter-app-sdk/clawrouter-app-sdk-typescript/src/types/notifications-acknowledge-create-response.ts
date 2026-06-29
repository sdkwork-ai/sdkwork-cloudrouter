import type { NotificationsAcknowledgeCreateResult } from './notifications-acknowledge-create-result';

export interface NotificationsAcknowledgeCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
