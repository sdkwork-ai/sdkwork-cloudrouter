import type { ShopsResumeResult } from './shops-resume-result';

export interface ShopsResumeResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
