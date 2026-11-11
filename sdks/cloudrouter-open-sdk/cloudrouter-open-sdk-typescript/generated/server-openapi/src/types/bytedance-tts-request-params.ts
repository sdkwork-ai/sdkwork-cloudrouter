import type { BytedanceTtsAudioParams } from './bytedance-tts-audio-params';
import type { ProviderJsonValue } from './provider-json-value';

/** ByteDance Seed TTS synthesis parameters. */
export interface BytedanceTtsRequestParams {
  /** JSON-encoded optional settings such as `pronunciation_dict`, `tone`, or `explicit_language`. */
  additions?: string;
  /** Audio params field on the bytedance tts request params, using the bytedance tts audio params module. */
  audio_params: BytedanceTtsAudioParams;
  /** Model version, default `seed-tts-2.0-standard`; required when `speaker` is a cloned voice. */
  model?: string;
  /** Pronunciation dictionary that corrects how specific words are read. */
  pronunciation_dict?: Record<string, ProviderJsonValue>;
  /** Seed TTS voice id from the console voice library. */
  speaker: string;
  /** SSML markup; only Chinese and English voices support it. */
  ssml?: string;
  /** Text to synthesize. */
  text: string;
  /** Pronunciation rules, for example `北京/(bei3)(jing1)`. */
  tone?: string[];
}
