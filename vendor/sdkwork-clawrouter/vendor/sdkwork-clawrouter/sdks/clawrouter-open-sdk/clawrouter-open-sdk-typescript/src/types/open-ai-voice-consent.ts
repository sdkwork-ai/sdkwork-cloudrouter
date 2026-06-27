import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible voice consent object. */
export interface OpenAiVoiceConsent {
  /** Consent document or provider-specific consent payload. */
  consent_document?: ProviderJsonValue;
  /** Unix timestamp in seconds when the consent was created. */
  created_at?: string;
  /** Voice consent identifier. */
  id: string;
  /** Developer-defined consent metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable consent name. */
  name?: string;
  /** Object type, normally voice.consent. */
  object: 'voice.consent';
  /** Consent lifecycle status. */
  status?: string;
}
