import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to reject an inbound realtime call. */
export interface OpenAiRealtimeCallRejectRequest {
  /** SIP status code used to reject the call. */
  status_code?: number;
}
