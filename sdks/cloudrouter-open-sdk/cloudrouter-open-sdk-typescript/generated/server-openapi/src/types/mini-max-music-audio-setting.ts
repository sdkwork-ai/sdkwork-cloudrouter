import type { ProviderJsonValue } from './provider-json-value';

/** Mini max music audio setting schema exposed by Cloud Router. */
export interface MiniMaxMusicAudioSetting {
  /** Output bitrate: 32000, 64000, 128000, or 256000. */
  bitrate?: number;
  /** Output container: mp3, wav, or pcm. */
  format?: string;
  /** Output sample rate: 16000, 24000, 32000, or 44100. */
  sample_rate?: number;
}
