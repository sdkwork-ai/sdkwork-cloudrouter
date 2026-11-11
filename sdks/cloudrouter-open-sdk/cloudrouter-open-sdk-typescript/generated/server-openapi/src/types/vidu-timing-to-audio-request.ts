import type { ProviderJsonValue } from './provider-json-value';

/** Vidu timing-to-audio request (`POST /ent/v2/timing2audio`). */
export interface ViduTimingToAudioRequest {
  /** Whether to add generated background music. */
  bgm?: boolean;
  /** Callback URL notified when the task changes state. */
  callback_url?: string;
  /** Audio duration in seconds. */
  duration?: number;
  /** Vidu audio model name, for example `audio1.0`. */
  model: string;
  /** Off-peak generation at a lower price. */
  off_peak?: boolean;
  /** Opaque payload forwarded to Vidu. */
  payload?: string;
  /** Optional deterministic seed. */
  seed?: number;
  /** Timed sound-effect events with `prompt`, `from`, and `to`. */
  timing_prompts: Record<string, ProviderJsonValue>[];
}
