import type { ShopsCreateResult } from './shops-create-result';

export interface ShopsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
