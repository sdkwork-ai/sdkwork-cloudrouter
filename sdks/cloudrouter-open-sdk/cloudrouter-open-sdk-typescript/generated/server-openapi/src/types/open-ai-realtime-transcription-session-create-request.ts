import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a realtime transcription session (`POST /v1/realtime/transcription_sessions`). */
export interface OpenAiRealtimeTranscriptionSessionCreateRequest {
  /** Additional event types to include. */
  include?: string[];
  /** Input audio format. */
  input_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  /** Input noise-reduction configuration. */
  input_audio_noise_reduction?: { type?: string; } & Record<string, ProviderJsonValue>;
  /** Transcription configuration. */
  input_audio_transcription?: { delay?: string; keywords?: string[]; language?: string; languages?: string[]; model?: string; prompt?: string; } & Record<string, ProviderJsonValue>;
  /** Voice activity detection configuration. */
  turn_detection?: { prefix_padding_ms?: number; silence_duration_ms?: number; threshold?: number; type?: string; } & Record<string, ProviderJsonValue>;
}
