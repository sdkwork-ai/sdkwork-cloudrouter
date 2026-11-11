import type { MinimaxStreamOptions } from './minimax-stream-options';
import type { MinimaxTimbreWeight } from './minimax-timbre-weight';
import type { MinimaxVoiceModify } from './minimax-voice-modify';
import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax T2A v2 speech synthesis request (`POST /v1/t2a_v2`). */
export interface MinimaxTextToSpeechRequest {
  /** Audio envelope: sample_rate, bitrate, format, and channel. */
  audio_setting?: Record<string, ProviderJsonValue>;
  /** Language hint that improves pronunciation; `auto` lets the model detect it. */
  language_boost?: string;
  /** Speech synthesis model. */
  model: 'speech-2.8-hd' | 'speech-2.8-turbo' | 'speech-2.6-hd' | 'speech-2.6-turbo' | 'speech-02-hd' | 'speech-02-turbo' | 'speech-01-hd' | 'speech-01-turbo';
  /** Audio delivery format; streaming supports only `hex`. */
  output_format?: 'url' | 'hex';
  /** Optional pronunciation overrides for specific words. */
  pronunciation_dict?: Record<string, ProviderJsonValue>;
  /** When true the vendor streams audio frames instead of one JSON body. */
  stream?: boolean;
  /** Streaming output options. */
  stream_options?: MinimaxStreamOptions;
  /** Whether the vendor also returns subtitle timings. */
  subtitle_enable?: boolean;
  /** Subtitle granularity. */
  subtitle_type?: 'sentence' | 'word' | 'word_streaming';
  /** Text to synthesize; at most 10,000 characters, `\n` for paragraph breaks, `<#x#>` pause markers. */
  text: string;
  /** Text normalization mode; overrides `voice_setting.text_normalization`. */
  text_normalization_mode?: 'basic' | 'quality';
  /** Mixed-voice weights; `voice_setting.voice_id` is left empty when used. */
  timbre_weights?: MinimaxTimbreWeight[];
  /** Voice effect configuration. */
  voice_modify?: MinimaxVoiceModify;
  /** Voice envelope: voice_id, speed, vol, pitch, and emotion. */
  voice_setting?: Record<string, ProviderJsonValue>;
}
