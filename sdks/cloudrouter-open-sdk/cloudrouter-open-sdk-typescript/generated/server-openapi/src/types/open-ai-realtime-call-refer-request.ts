import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to refer or transfer a realtime call. */
export interface OpenAiRealtimeCallReferRequest {
  /** Developer-defined realtime call action metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Refer target, SIP URI, phone number, or provider-specific target. */
  target?: string;
}
