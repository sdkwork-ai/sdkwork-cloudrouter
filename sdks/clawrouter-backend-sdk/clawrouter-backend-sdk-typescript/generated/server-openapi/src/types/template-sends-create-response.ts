import type { TemplateSendsCreateResult } from './template-sends-create-result';

export interface TemplateSendsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
