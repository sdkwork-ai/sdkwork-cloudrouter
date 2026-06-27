import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible organization usage bucket. */
export interface OpenAiOrganizationUsageBucket {
  /** Unix timestamp for the bucket end. */
  end_time?: string;
  /** Input token count when returned directly. */
  input_tokens?: number;
  /** Request count when returned directly. */
  num_requests?: number;
  /** Object type returned by the usage endpoint. */
  object?: string;
  /** Output token count when returned directly. */
  output_tokens?: number;
  /** Usage results grouped inside this bucket. */
  results?: ProviderJsonValue[];
  /** Unix timestamp for the bucket start. */
  start_time?: string;
}
