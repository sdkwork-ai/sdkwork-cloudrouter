import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to compact response or conversation state. */
export interface OpenAiResponseCompactRequest {
  /** Responses API input, response state, or conversation state to compact. */
  input?: ProviderJsonValue;
  /** Developer-defined metadata attached to the compaction request. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Model id or Claw Router catalog key used for compaction. */
  model?: string;
  /** Previous response identifier to compact from. */
  previous_response_id?: string;
}
