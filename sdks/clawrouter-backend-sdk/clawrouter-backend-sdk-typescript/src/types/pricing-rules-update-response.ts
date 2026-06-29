import type { PricingRulesUpdateResult } from './pricing-rules-update-result';

export interface PricingRulesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
