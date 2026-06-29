import type { PromotionsCodesCreateResult } from './promotions-codes-create-result';

export interface PromotionsCodesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
