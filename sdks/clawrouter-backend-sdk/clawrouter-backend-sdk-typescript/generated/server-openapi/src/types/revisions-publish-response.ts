import type { RevisionsPublishResult } from './revisions-publish-result';

export interface RevisionsPublishResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
