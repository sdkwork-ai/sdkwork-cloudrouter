import type { JsonValue } from './json-value';

/** Payment provider mutation response schema exposed by Cloud Router. */
export interface PaymentProviderMutationResponse {
  /** Provider field on payment provider mutation response. */
  provider: Record<string, JsonValue>;
}
