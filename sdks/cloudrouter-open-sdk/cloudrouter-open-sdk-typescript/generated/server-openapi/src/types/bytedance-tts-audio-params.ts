import type { ProviderJsonValue } from './provider-json-value';

/** ByteDance TTS output audio parameters. */
export interface BytedanceTtsAudioParams {
  /** Output audio format. */
  format: 'mp3' | 'pcm' | 'ogg_opus' | 'wav';
  /** Volume relative to the default. */
  loudness_rate?: number;
  /** Output sample rate in Hz, for example 24000. */
  sample_rate: number;
  /** Speech rate relative to the default. */
  speech_rate?: number;
}
