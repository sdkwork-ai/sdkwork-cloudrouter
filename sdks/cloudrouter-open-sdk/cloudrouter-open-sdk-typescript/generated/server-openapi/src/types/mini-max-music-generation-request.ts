import type { MiniMaxMusicAudioSetting } from './mini-max-music-audio-setting';
import type { ProviderJsonValue } from './provider-json-value';

/** Mini max music generation request schema exposed by Cloud Router. */
export interface MiniMaxMusicGenerationRequest {
  /** Audio setting field on the mini max music generation request, using the mini max music audio setting module. */
  audio_setting?: MiniMaxMusicAudioSetting;
  /** Generate instrumental music without vocals. */
  is_instrumental?: boolean;
  /** Lyrics with structure tags such as [Verse] and [Chorus]. */
  lyrics?: string;
  /** Let the model generate lyrics from the prompt when lyrics are empty. */
  lyrics_optimizer?: boolean;
  /** MiniMax music model id, for example music-3.0 or music-2.6. */
  model: string;
  /** Audio delivery format: url or hex. */
  output_format?: string;
  /** Style, mood, or scene description for the generated music. */
  prompt?: string;
  /** Stream the generated audio back instead of returning one payload. */
  stream?: boolean;
}
