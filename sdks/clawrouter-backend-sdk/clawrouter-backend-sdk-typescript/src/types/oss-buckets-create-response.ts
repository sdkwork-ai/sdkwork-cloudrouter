import type { OssBucketsCreateResult } from './oss-buckets-create-result';

export interface OssBucketsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
