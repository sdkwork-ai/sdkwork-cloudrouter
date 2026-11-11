import type { ProviderJsonValue } from './provider-json-value';

/** Ephemeral realtime client secret value. */
export interface OpenAiRealtimeClientSecretValue {
  /** Unix timestamp in seconds when the secret expires. */
  expires_at?: string;
  /** Ephemeral secret value. */
  value: string;
}
