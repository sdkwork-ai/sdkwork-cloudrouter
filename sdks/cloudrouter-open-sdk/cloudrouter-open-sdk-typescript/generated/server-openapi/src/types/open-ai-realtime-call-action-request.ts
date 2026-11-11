import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to accept an inbound realtime call (`POST /v1/realtime/calls/{call_id}/accept`). */
export interface OpenAiRealtimeCallActionRequest {
  /** Input and output audio configuration. */
  audio?: Record<string, ProviderJsonValue>;
  /** Additional event types to include. */
  include?: string[];
  /** Session instructions. */
  instructions?: string;
  /** Maximum output tokens. */
  max_output_tokens?: number;
  /** Realtime model id. */
  model?: string;
  /** Output modalities; defaults to `["audio"]`. */
  output_modalities?: string[];
  /** Whether the model may call tools in parallel. */
  parallel_tool_calls?: boolean;
  /** Prompt template configuration. */
  prompt?: Record<string, ProviderJsonValue>;
  /** Reasoning configuration. */
  reasoning?: Record<string, ProviderJsonValue>;
  /** Tool choice mode. */
  tool_choice?: string;
  /** Tools available to the session. */
  tools?: Record<string, ProviderJsonValue>[];
  /** Tracing configuration. */
  tracing?: Record<string, ProviderJsonValue>;
  /** Conversation truncation policy. */
  truncation?: Record<string, ProviderJsonValue>;
  /** Action type. */
  type: string;
}
