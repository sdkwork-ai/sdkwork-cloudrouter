import type { PromotionsUserCouponsRetrieveResult } from './promotions-user-coupons-retrieve-result';

export interface PromotionsUserCouponsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
