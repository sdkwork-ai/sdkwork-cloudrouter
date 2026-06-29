import type { OssProvidersCreateResult } from './oss-providers-create-result';

export interface OssProvidersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
