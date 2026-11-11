import type { ProviderJsonValue } from './provider-json-value';

/** DashScope TTS input envelope. */
export interface AlibabaSpeechInput {
  /** Instruction-control prompt for Qwen3-TTS-Instruct models; up to 1600 tokens. */
  instructions?: string;
  /** Language of the input text; defaults to Auto. */
  language_type?: 'Auto' | 'Chinese' | 'English' | 'German' | 'Italian' | 'Portuguese' | 'Spanish' | 'Japanese' | 'Korean' | 'French' | 'Russian';
  /** Rewrite `instructions` for more natural speech; requires `instructions`. */
  optimize_instructions?: boolean;
  /** Text to synthesize; Qwen-TTS accepts up to 600 characters for non-Qwen3 models. */
  text: string;
  /** System voice name, for example Cherry. */
  voice: string;
}
