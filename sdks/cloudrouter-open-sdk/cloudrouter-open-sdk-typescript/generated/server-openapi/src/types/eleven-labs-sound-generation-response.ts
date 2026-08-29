import type { ProviderJsonValue } from './provider-json-value';

export interface ElevenLabsSoundGenerationResponse {
  /** ElevenLabs task identifier. */
  id?: string;
  /** Task status. */
  status?: string;
  /** URL of the generated sound effect audio. */
  audio_url?: string;
  /** Alias for the generated audio URL. */
  url?: string;
  /** Nested audio descriptor when the provider returns one. */
  audio?: { id?: string; url?: string; };
}
