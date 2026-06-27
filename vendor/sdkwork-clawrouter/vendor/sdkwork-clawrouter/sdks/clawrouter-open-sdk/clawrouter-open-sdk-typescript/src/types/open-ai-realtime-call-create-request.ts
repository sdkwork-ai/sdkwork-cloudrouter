import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create or start a realtime call. */
export interface OpenAiRealtimeCallCreateRequest {
  /** Developer-defined realtime call metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** WebRTC SDP offer. */
  sdp?: string;
  /** Realtime session configuration. */
  session?: ProviderJsonValue;
}
