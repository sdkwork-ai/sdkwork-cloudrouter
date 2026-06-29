import type { OssProvidersUpdateResult } from './oss-providers-update-result';

export interface OssProvidersUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
