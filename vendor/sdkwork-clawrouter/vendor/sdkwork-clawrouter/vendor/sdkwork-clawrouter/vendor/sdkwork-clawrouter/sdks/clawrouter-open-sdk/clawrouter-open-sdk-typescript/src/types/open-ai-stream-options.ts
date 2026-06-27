import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai stream options schema exposed by Claw Router. */
export interface OpenAiStreamOptions {
  /** Whether the final stream event should include token usage. */
  include_usage?: boolean;
}
