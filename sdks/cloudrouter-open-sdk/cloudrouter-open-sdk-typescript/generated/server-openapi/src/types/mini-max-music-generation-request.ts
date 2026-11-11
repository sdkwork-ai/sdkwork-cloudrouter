import type { MiniMaxMusicAudioSetting } from './mini-max-music-audio-setting';
import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax music generation request (`POST /v1/music_generation`). */
export interface MiniMaxMusicGenerationRequest {
  /** Base64 reference audio for `music-cover` models; exactly one of `audio_url` or `audio_base64`. */
  audio_base64?: string;
  /** Audio output configuration. */
  audio_setting?: MiniMaxMusicAudioSetting;
  /** Reference audio URL for `music-cover` models; exactly one of `audio_url` or `audio_base64`. */
  audio_url?: string;
  /** Feature id from the Music Cover Preprocess API; mutually exclusive with the reference audio fields. */
  cover_feature_id?: string;
  /** Generate instrumental music without vocals. */
  is_instrumental?: boolean;
  /** Lyrics with structure tags such as [Verse] and [Chorus]. */
  lyrics?: string;
  /** Let the model generate lyrics from the prompt when lyrics are empty. */
  lyrics_optimizer?: boolean;
  /** Music model name. */
  model: 'music-3.0' | 'music-2.6' | 'music-cover' | 'music-3.0-free' | 'music-2.6-free' | 'music-cover-free';
  /** Audio delivery format; streaming supports only `hex`. */
  output_format?: 'url' | 'hex';
  /** Style, mood, or scene description for the generated music. */
  prompt?: string;
  /** Stream the generated audio back instead of returning one payload. */
  stream?: boolean;
}
