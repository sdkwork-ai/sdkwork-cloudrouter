import type { ShopsCategoryBindingsUpsertResult } from './shops-category-bindings-upsert-result';

export interface ShopsCategoryBindingsUpsertResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
