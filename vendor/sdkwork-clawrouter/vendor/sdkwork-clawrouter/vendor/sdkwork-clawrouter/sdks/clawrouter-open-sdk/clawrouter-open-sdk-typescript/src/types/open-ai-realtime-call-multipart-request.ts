import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai realtime call multipart request schema exposed by Claw Router. */
export interface OpenAiRealtimeCallMultipartRequest {
  /** WebRTC SDP offer. */
  sdp: string;
  /** JSON-serialized realtime session configuration. */
  session?: string;
}
