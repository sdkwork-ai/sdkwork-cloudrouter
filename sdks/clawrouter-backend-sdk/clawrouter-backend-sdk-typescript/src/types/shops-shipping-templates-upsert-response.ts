import type { ShopsShippingTemplatesUpsertResult } from './shops-shipping-templates-upsert-result';

export interface ShopsShippingTemplatesUpsertResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
