import type { InventoryStocksUpdateResult } from './inventory-stocks-update-result';

export interface InventoryStocksUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
