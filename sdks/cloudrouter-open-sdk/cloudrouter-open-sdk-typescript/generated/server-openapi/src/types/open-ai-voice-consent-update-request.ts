import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update a voice consent. */
export interface OpenAiVoiceConsentUpdateRequest {
  /** Human-readable consent name. */
  name?: string;
}
