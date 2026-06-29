import type { GcJobsCreateResult } from './gc-jobs-create-result';

export interface GcJobsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
