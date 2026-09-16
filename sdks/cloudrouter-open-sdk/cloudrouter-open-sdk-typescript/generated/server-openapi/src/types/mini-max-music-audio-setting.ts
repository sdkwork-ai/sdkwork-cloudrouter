/** MiniMax music generation audio setting. */
export interface MiniMaxMusicAudioSetting {
  /** Output sample rate: 16000, 24000, 32000, or 44100. */
  sample_rate?: number;
  /** Output bitrate: 32000, 64000, 128000, or 256000. */
  bitrate?: number;
  /** Output container: mp3, wav, or pcm. */
  format?: string;
}
