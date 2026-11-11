import type { ProviderJsonValue } from './provider-json-value';

/** Stability AI Stable Audio text-to-audio request, sent as multipart/form-data. */
export interface StabilityAudioRequest {
  /** Classifier-free guidance scale. */
  cfg_scale?: number;
  /** Output duration in seconds, 1 to 190. */
  duration?: number;
  /** Audio model variant; selects music versus sound-effect quality tiers. */
  model?: 'stable-audio-2' | 'stable-audio-2.5';
  /** Requested output audio format. */
  output_format?: 'mp3' | 'wav';
  /** What the output audio should be: instruments, mood, style, and genre. */
  prompt: string;
  /** Seed for reproducible output; omit or 0 for a random seed. */
  seed?: number;
  /** Diffusion steps; higher favors quality over speed. */
  steps?: number;
}
