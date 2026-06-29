import type { PromotionsOffersUpdateResult } from './promotions-offers-update-result';

export interface PromotionsOffersUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
