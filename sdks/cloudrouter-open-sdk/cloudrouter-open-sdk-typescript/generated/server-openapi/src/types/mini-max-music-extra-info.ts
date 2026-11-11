import type { ProviderJsonValue } from './provider-json-value';

/** Mini max music extra info schema exposed by Cloud Router. */
export interface MiniMaxMusicExtraInfo {
  /** Generated audio bitrate. */
  bitrate?: number;
  /** Generated audio channel count. */
  music_channel?: number;
  /** Generated music duration in seconds. */
  music_duration?: number;
  /** Generated audio sample rate. */
  music_sample_rate?: number;
  /** Generated audio size in bytes. */
  music_size?: number;
}
