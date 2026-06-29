import type { PricingRulesCreateResult } from './pricing-rules-create-result';

export interface PricingRulesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
