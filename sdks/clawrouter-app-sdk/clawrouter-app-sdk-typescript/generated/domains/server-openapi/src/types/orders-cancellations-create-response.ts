import type { OrdersCancellationsCreateResult } from './orders-cancellations-create-result';

export interface OrdersCancellationsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
