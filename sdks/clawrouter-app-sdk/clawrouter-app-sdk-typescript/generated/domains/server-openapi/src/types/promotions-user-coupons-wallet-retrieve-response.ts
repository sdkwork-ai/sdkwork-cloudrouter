import type { PromotionsUserCouponsWalletRetrieveResult } from './promotions-user-coupons-wallet-retrieve-result';

export interface PromotionsUserCouponsWalletRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
