import type { ProviderJsonValue } from './provider-json-value';

/** Eleven labs text to speech response schema exposed by Cloud Router. */
export interface ElevenLabsTextToSpeechResponse {
  /** URL of the synthesized speech audio. */
  audio_url?: string;
  /** ElevenLabs task identifier. */
  id?: string;
  /** Task status. */
  status?: string;
  /** Alias for the synthesized audio URL. */
  url?: string;
}
