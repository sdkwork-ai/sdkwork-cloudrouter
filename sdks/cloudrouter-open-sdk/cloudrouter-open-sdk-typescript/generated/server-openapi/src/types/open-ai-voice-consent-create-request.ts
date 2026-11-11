import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a voice consent. */
export interface OpenAiVoiceConsentCreateRequest {
  /** Consent document or provider-specific consent payload. */
  consent_document?: ProviderJsonValue;
  /** Developer-defined consent metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable consent name. */
  name?: string;
}
