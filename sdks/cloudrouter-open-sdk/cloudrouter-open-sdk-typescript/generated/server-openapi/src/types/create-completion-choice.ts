import type { CreateCompletionLogprobs } from './create-completion-logprobs';
import type { ProviderJsonValue } from './provider-json-value';

/** Single choice returned by the legacy OpenAI-compatible completions API. */
export interface CreateCompletionChoice {
  /** Reason generation finished, such as stop, length, or content_filter. */
  finish_reason?: string;
  /** Choice index in the returned choices array. */
  index?: number;
  /** Logprobs field on the create completion choice, using the create completion logprobs module. */
  logprobs?: CreateCompletionLogprobs;
  /** Generated completion text. */
  text?: string;
}
