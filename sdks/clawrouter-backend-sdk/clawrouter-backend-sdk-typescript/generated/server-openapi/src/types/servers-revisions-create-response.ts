import type { ServersRevisionsCreateResult } from './servers-revisions-create-result';

export interface ServersRevisionsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
