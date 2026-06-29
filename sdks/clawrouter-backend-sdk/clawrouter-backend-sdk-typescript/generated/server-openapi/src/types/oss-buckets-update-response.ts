import type { OssBucketsUpdateResult } from './oss-buckets-update-result';

export interface OssBucketsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
