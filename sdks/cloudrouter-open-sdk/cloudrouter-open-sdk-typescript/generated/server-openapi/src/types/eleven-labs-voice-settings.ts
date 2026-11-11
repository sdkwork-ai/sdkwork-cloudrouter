import type { ProviderJsonValue } from './provider-json-value';

/** ElevenLabs per-request voice settings. */
export interface ElevenLabsVoiceSettings {
  /** How closely the output matches professional voice clone samples in [0, 1]; applies only to v4 fine-tuned clones. */
  clone_strength?: number;
  /** How closely the output adheres to the original voice in [0, 1]. */
  similarity_boost?: number;
  /** Speech speed, where 1.0 is the stored voice speed. */
  speed?: number;
  /** Voice stability in [0, 1]; lower values widen the emotional range. */
  stability?: number;
  /** Style exaggeration; non-zero values cost more compute and add latency. */
  style?: number;
  /** Boost similarity to the original speaker at a slightly higher latency. */
  use_speaker_boost?: boolean;
}
