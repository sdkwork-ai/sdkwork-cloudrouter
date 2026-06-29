import type { TurnsCreateResult } from './turns-create-result';

export interface TurnsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
