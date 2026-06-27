import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai conversation update request schema exposed by Claw Router. */
export interface OpenAiConversationUpdateRequest {
  /** Replacement metadata for the conversation. */
  metadata?: Record<string, string>;
}
