import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to synthesize speech audio. */
export interface OpenAiSpeechCreateRequest {
  /** Text to synthesize; at most 4096 characters. */
  input: string;
  /** Voice control instructions; not supported by tts-1 or tts-1-hd. */
  instructions?: string;
  /** TTS model id such as tts-1, tts-1-hd, or gpt-4o-mini-tts. */
  model: string;
  /** Requested audio response format. */
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  /** Speech speed in [0.25, 4.0]. */
  speed?: number;
  /** Streaming format; `sse` is not supported by tts-1 or tts-1-hd. */
  stream_format?: 'sse' | 'audio';
  /** Built-in voice name such as alloy, ash, or marin, or a custom voice object with an `id`. */
  voice: string;
}
