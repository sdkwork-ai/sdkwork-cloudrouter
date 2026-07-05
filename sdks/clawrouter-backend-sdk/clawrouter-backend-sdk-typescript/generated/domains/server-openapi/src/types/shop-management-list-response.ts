import type { ShopSummary } from './shop-summary';

export interface ShopManagementListResponse {
  code: string;
  message: string;
  /** Server-owned request correlation id. */
  requestId: string;
  data: Record<string, unknown>;
}
