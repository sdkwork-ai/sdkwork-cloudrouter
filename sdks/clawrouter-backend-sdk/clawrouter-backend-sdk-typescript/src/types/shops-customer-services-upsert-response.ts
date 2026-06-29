import type { ShopsCustomerServicesUpsertResult } from './shops-customer-services-upsert-result';

export interface ShopsCustomerServicesUpsertResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
