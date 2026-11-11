import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a realtime session (`POST /v1/realtime/sessions`). */
export interface OpenAiRealtimeSessionCreateRequest {
  /** Ephemeral secret used by the session. */
  client_secret: { expires_at?: number; value?: string; } & Record<string, ProviderJsonValue>;
  /** Input audio format. */
  input_audio_format?: string;
  /** Input transcription configuration. */
  input_audio_transcription?: { model?: string; } & Record<string, ProviderJsonValue>;
  /** Session instructions. */
  instructions?: string;
  /** Maximum output tokens per response. */
  max_response_output_tokens?: number;
  /** Session modalities, for example text and audio. */
  modalities?: string[];
  /** Output audio format. */
  output_audio_format?: string;
  /** Prompt template configuration. */
  prompt?: Record<string, ProviderJsonValue>;
  /** Voice speed in [0.25, 1.5]. */
  speed?: number;
  /** Sampling temperature. */
  temperature?: number;
  /** Tool choice mode. */
  tool_choice?: string;
  /** Tools available to the session. */
  tools?: Record<string, ProviderJsonValue>[];
  /** Tracing configuration. */
  tracing?: Record<string, ProviderJsonValue>;
  /** Conversation truncation policy. */
  truncation?: Record<string, ProviderJsonValue>;
  /** Voice activity detection configuration. */
  turn_detection?: Record<string, ProviderJsonValue>;
  /** Voice id or custom voice object. */
  voice?: string;
}
