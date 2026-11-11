import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create an ephemeral realtime client secret (`POST /v1/realtime/client_secrets`). */
export interface OpenAiRealtimeClientSecretCreateRequest {
  /** Secret expiration policy. */
  expires_after?: { anchor?: 'created_at'; seconds?: number; } & Record<string, ProviderJsonValue>;
  /** Realtime session configuration accepted by the official client-secrets endpoint. */
  session?: Record<string, ProviderJsonValue>;
}
