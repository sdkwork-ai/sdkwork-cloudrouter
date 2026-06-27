import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a voice consent. */
export interface OpenAiVoiceConsentUpdateRequest {
  /** Developer-defined consent metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable consent name. */
  name?: string;
}
