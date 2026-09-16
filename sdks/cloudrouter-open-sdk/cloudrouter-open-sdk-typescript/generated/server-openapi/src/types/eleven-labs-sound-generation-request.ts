import type { ProviderJsonValue } from './provider-json-value';

/** Eleven labs sound generation request schema exposed by Cloud Router. */
export interface ElevenLabsSoundGenerationRequest {
  /** Requested sound effect duration in seconds. */
  duration_seconds?: number;
  /** Whether the sound effect should loop seamlessly. */
  loop?: boolean;
  /** ElevenLabs-compatible model identifier. */
  model_id: string;
  /** How strongly the prompt influences the generated sound. */
  prompt_influence?: number;
  /** Text description of the sound effect to generate. */
  text: string;
}
