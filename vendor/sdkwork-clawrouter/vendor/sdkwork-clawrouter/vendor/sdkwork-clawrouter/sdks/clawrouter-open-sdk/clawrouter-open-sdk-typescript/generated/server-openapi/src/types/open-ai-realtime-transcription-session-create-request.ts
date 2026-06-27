import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a realtime transcription session. */
export interface OpenAiRealtimeTranscriptionSessionCreateRequest {
  /** Input audio format for transcription. */
  input_audio_format?: string;
  /** Realtime transcription configuration. */
  input_audio_transcription?: ProviderJsonValue;
  /** Developer-defined realtime metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Realtime transcription model id or Claw Router catalog key. */
  model?: string;
  /** Realtime turn detection configuration. */
  turn_detection?: ProviderJsonValue;
}
