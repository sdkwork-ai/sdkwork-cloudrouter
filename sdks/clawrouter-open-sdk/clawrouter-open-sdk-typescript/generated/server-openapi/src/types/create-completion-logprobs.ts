import type { ProviderJsonObject } from './provider-json-object';
import type { ProviderJsonValue } from './provider-json-value';

/** Token log probability details returned for a completion choice. */
export interface CreateCompletionLogprobs {
  /** Character offsets for returned tokens. */
  text_offset?: number[];
  /** Log probabilities for returned tokens. */
  token_logprobs?: number[];
  /** Generated or echoed token strings. */
  tokens?: string[];
  /** Most likely token candidates and their log probabilities. */
  top_logprobs?: ProviderJsonObject[];
}
