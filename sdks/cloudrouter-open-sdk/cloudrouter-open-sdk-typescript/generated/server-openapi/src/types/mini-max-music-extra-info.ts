/** MiniMax music generation extra metadata. */
export interface MiniMaxMusicExtraInfo {
  /** Generated music duration in seconds. */
  music_duration?: number;
  /** Generated audio sample rate. */
  music_sample_rate?: number;
  /** Generated audio channel count. */
  music_channel?: number;
  /** Generated audio bitrate. */
  bitrate?: number;
  /** Generated audio size in bytes. */
  music_size?: number;
}
