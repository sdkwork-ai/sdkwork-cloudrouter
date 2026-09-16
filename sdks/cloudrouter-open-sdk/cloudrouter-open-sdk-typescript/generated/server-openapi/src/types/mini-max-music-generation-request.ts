import type { MiniMaxMusicAudioSetting } from './mini-max-music-audio-setting';

/** MiniMax music generation request payload. */
export interface MiniMaxMusicGenerationRequest {
  /** MiniMax music model id, for example music-3.0 or music-2.6. */
  model: string;
  /** Style, mood, or scene description for the generated music. */
  prompt?: string;
  /** Lyrics with structure tags such as [Verse] and [Chorus]. */
  lyrics?: string;
  /** Stream the generated audio back instead of returning one payload. */
  stream?: boolean;
  /** Audio delivery format: url or hex. */
  output_format?: string;
  /** Generate instrumental music without vocals. */
  is_instrumental?: boolean;
  /** Let the model generate lyrics from the prompt when lyrics are empty. */
  lyrics_optimizer?: boolean;
  audio_setting?: MiniMaxMusicAudioSetting;
}
