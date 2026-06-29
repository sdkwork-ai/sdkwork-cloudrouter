import type { ShopsBrandAuthorizationsUpsertResult } from './shops-brand-authorizations-upsert-result';

export interface ShopsBrandAuthorizationsUpsertResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
