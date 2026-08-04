import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request for a realtime call action. */
export interface OpenAiRealtimeCallActionRequest {
  /** Developer-defined realtime call action metadata. */
  metadata?: Record<string, ProviderJsonValue>;
}
