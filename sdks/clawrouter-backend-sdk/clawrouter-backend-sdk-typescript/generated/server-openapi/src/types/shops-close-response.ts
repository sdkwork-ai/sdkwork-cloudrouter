import type { ShopsCloseResult } from './shops-close-result';

export interface ShopsCloseResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
