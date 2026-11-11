import type { ElevenLabsAudioEffects } from './eleven-labs-audio-effects';
import type { ElevenLabsPronunciationDictionaryLocator } from './eleven-labs-pronunciation-dictionary-locator';
import type { ElevenLabsVoiceSettings } from './eleven-labs-voice-settings';
import type { ProviderJsonValue } from './provider-json-value';

/** ElevenLabs text-to-speech request (`POST /v1/text-to-speech/{voice_id}`). */
export interface ElevenLabsTextToSpeechRequest {
  /** Enable language text normalization; currently Japanese only and may add latency. */
  apply_language_text_normalization?: boolean;
  /** Text normalization mode. */
  apply_text_normalization?: 'auto' | 'on' | 'off';
  /** Audio effects applied to the generated speech. */
  audio_effects?: ElevenLabsAudioEffects;
  /** ISO 639-1 language code used to enforce a language for the model and text normalization; ignored when the model does not support it. */
  language_code?: string;
  /** Text-to-speech model id; the vendor default is `eleven_multilingual_v2`. */
  model_id?: string;
  /** Request ids generated after this one, at most 3; takes precedence over `next_text`. */
  next_request_ids?: string[];
  /** Text that follows this request, used to keep concatenated generations continuous. */
  next_text?: string;
  /** Request ids generated before this one, at most 3; takes precedence over `previous_text`. */
  previous_request_ids?: string[];
  /** Text that preceded this request, used to keep concatenated generations continuous. */
  previous_text?: string;
  /** Pronunciation dictionaries applied to the text in order; at most 3. */
  pronunciation_dictionary_locators?: ElevenLabsPronunciationDictionaryLocator[];
  /** Best-effort deterministic sampling seed in [0, 4294967295]. */
  seed?: number;
  /** Text to synthesize into speech. */
  text: string;
  /** Use the IVC version of a professional voice to improve expressiveness and reduce latency. */
  use_pvc_as_ivc?: boolean;
  /** Voice settings that override the stored settings for this request only. */
  voice_settings?: ElevenLabsVoiceSettings;
}
