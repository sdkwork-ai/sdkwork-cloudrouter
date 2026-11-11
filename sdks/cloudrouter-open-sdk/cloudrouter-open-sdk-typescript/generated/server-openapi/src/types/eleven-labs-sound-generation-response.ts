import type { ProviderJsonValue } from './provider-json-value';

/** Eleven labs sound generation response schema exposed by Cloud Router. */
export interface ElevenLabsSoundGenerationResponse {
  /** Nested audio descriptor when the provider returns one. */
  audio?: { id?: string; url?: string; };
  /** URL of the generated sound effect audio. */
  audio_url?: string;
  /** ElevenLabs task identifier. */
  id?: string;
  /** Task status. */
  status?: string;
  /** Alias for the generated audio URL. */
  url?: string;
}
