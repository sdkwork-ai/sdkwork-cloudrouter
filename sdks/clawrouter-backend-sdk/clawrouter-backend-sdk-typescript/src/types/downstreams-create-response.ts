import type { DownstreamsCreateResult } from './downstreams-create-result';

export interface DownstreamsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
