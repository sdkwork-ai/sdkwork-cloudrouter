import type { ProviderJsonValue } from './provider-json-value';

/** Eleven labs text to speech request schema exposed by Cloud Router. */
export interface ElevenLabsTextToSpeechRequest {
  /** ElevenLabs-compatible model identifier. */
  model_id: string;
  /** Text to synthesize into speech. */
  text: string;
  /** Voice settings such as speed. */
  voice_settings?: { speed?: number; };
}
