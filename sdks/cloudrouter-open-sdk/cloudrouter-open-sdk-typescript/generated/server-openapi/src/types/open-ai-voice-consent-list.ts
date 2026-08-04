import type { OpenAiVoiceConsent } from './open-ai-voice-consent';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of voice consents. */
export interface OpenAiVoiceConsentList {
  /** Voice consents in the returned page. */
  data: OpenAiVoiceConsent[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
