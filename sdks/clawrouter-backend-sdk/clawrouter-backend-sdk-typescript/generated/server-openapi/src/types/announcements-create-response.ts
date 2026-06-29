import type { AnnouncementsCreateResult } from './announcements-create-result';

export interface AnnouncementsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
