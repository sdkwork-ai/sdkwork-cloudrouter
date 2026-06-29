import type { OssQuotasCreateResult } from './oss-quotas-create-result';

export interface OssQuotasCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
