import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax music audio output configuration. */
export interface MiniMaxMusicAudioSetting {
  /** Output bitrate. */
  bitrate?: 32000 | 64000 | 128000 | 256000;
  /** Output container format. */
  format?: 'mp3' | 'wav' | 'pcm';
  /** Output sample rate. */
  sample_rate?: 16000 | 24000 | 32000 | 44100;
}
