export interface ElevenLabsTextToSpeechRequest {
  /** ElevenLabs-compatible model identifier. */
  model_id: string;
  /** Text to synthesize into speech. */
  text: string;
  /** Voice settings such as speed. */
  voice_settings?: { speed?: number; };
}
