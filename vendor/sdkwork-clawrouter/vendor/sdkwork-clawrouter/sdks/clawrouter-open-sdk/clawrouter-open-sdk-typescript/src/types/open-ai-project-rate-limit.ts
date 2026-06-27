import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible project rate limit object. */
export interface OpenAiProjectRateLimit {
  /** Maximum batch input tokens per day. */
  batch_1_day_max_input_tokens?: number;
  /** Project rate limit identifier. */
  id: string;
  /** Maximum images per minute. */
  max_images_per_1_minute?: number;
  /** Maximum requests per minute. */
  max_requests_per_1_minute?: number;
  /** Maximum tokens per minute. */
  max_tokens_per_1_minute?: number;
  /** Model identifier the rate limit applies to. */
  model?: string;
  /** Object type, normally project.rate_limit. */
  object: 'project.rate_limit';
}
