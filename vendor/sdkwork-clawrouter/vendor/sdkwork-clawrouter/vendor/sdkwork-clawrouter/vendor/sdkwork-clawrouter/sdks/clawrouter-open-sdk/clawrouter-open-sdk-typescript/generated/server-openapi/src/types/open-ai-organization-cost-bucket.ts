import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible organization cost bucket. */
export interface OpenAiOrganizationCostBucket {
  /** Cost amount when returned directly. */
  amount?: number;
  /** Currency for the cost amount. */
  currency?: string;
  /** Unix timestamp for the bucket end. */
  end_time?: string;
  /** Object type returned by the costs endpoint. */
  object?: string;
  /** Cost results grouped inside this bucket. */
  results?: ProviderJsonValue[];
  /** Unix timestamp for the bucket start. */
  start_time?: string;
}
