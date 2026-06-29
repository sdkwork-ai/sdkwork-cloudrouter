import type { PromotionsOffersCreateResult } from './promotions-offers-create-result';

export interface PromotionsOffersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
