import type { PromotionsDiscountApplicationsSettleResult } from './promotions-discount-applications-settle-result';

export interface PromotionsDiscountApplicationsSettleResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
