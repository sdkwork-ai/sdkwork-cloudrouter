import type { TemplatesVersionsPublishResult } from './templates-versions-publish-result';

export interface TemplatesVersionsPublishResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
