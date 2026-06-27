import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a project rate limit. */
export interface OpenAiProjectRateLimitUpdateRequest {
  /** Maximum batch input tokens per day. */
  batch_1_day_max_input_tokens?: number;
  /** Maximum images per minute. */
  max_images_per_1_minute?: number;
  /** Maximum requests per minute. */
  max_requests_per_1_minute?: number;
  /** Maximum tokens per minute. */
  max_tokens_per_1_minute?: number;
}
