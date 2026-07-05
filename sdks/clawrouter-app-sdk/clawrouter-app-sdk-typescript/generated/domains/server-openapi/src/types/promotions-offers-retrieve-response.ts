import type { PromotionsOffersRetrieveResult } from './promotions-offers-retrieve-result';

export interface PromotionsOffersRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
