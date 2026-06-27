import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a realtime client secret. */
export interface OpenAiRealtimeClientSecretCreateRequest {
  /** Realtime session instructions. */
  instructions?: string;
  /** Developer-defined realtime metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Realtime modalities requested by the session. */
  modalities?: string[];
  /** Realtime model id or Claw Router catalog key. */
  model?: string;
  /** Voice identifier for realtime audio output. */
  voice?: string;
}
