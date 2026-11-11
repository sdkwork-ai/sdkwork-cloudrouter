import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai incomplete details schema exposed by Cloud Router. */
export interface OpenAiIncompleteDetails {
  /** Reason the response is incomplete. */
  reason: 'max_output_tokens' | 'content_filter';
}
