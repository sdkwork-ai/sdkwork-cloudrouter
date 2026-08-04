import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible realtime call object. */
export interface OpenAiRealtimeCall {
  /** Unix timestamp in seconds when the call was created. */
  created_at?: string;
  /** Realtime call identifier. */
  id: string;
  /** Developer-defined realtime call metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally realtime.call. */
  object: 'realtime.call';
  /** WebRTC SDP payload when returned as JSON. */
  sdp?: string;
  /** Realtime session object associated with the call. */
  session?: ProviderJsonValue;
  /** Realtime call lifecycle status. */
  status: string;
}
