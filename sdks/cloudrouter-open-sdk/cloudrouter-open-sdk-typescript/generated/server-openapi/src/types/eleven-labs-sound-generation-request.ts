import type { ProviderJsonValue } from './provider-json-value';

/** ElevenLabs sound-effect generation request (`POST /v1/sound-generation`). */
export interface ElevenLabsSoundGenerationRequest {
  /** Requested duration in seconds; the model guesses when omitted. */
  duration_seconds?: number;
  /** Whether the sound effect should loop seamlessly. */
  loop?: boolean;
  /** Sound-effect model id. */
  model_id?: 'eleven_text_to_sound_v2' | 'eleven_text_to_sound_v3';
  /** How strongly the prompt influences the generated sound. */
  prompt_influence?: number;
  /** Text description of the sound effect to generate. */
  text: string;
}
