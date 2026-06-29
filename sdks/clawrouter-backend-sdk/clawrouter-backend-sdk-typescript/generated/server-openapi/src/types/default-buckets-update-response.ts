import type { DefaultBucketsUpdateResult } from './default-buckets-update-result';

export interface DefaultBucketsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
