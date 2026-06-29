import type { TemplatesCreateResult } from './templates-create-result';

export interface TemplatesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
