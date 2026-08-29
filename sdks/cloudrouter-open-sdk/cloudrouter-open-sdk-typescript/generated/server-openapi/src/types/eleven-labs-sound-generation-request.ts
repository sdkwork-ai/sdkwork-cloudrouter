export interface ElevenLabsSoundGenerationRequest {
  /** ElevenLabs-compatible model identifier. */
  model_id: string;
  /** Text description of the sound effect to generate. */
  text: string;
  /** Requested sound effect duration in seconds. */
  duration_seconds?: number;
  /** How strongly the prompt influences the generated sound. */
  prompt_influence?: number;
  /** Whether the sound effect should loop seamlessly. */
  loop?: boolean;
}
