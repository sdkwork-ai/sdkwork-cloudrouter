import type { ShopRiskSignal } from './shop-risk-signal';

export interface ShopRiskSignalResponse {
  code: string;
  message: string;
  /** Server-owned request correlation id. */
  requestId: string;
  data: ShopRiskSignal;
}
