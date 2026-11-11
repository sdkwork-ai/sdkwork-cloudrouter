import type { OpenAiRealtimeClientSecretValue } from './open-ai-realtime-client-secret-value';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible realtime client secret bootstrap response. */
export interface OpenAiRealtimeClientSecret {
  /** Client secret field on the open ai realtime client secret, using the open ai realtime client secret value module. */
  client_secret: OpenAiRealtimeClientSecretValue;
  /** Realtime session object returned by the upstream. */
  session?: ProviderJsonValue;
}
