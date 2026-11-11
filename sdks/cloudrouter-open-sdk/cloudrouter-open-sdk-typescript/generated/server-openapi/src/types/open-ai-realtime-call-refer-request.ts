import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to refer or transfer a realtime call. */
export interface OpenAiRealtimeCallReferRequest {
  /** SIP URI to transfer the call to. */
  target_uri: string;
}
