import type { OpenAiRealtimeClientSecretValue } from './open-ai-realtime-client-secret-value';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible realtime session object. */
export interface OpenAiRealtimeSession {
  /** Client secret field on the open ai realtime session, using the open ai realtime client secret value module. */
  client_secret?: OpenAiRealtimeClientSecretValue;
  /** Realtime session identifier. */
  id: string;
  /** Realtime session instructions. */
  instructions?: string;
  /** Realtime modalities enabled for the session. */
  modalities?: string[];
  /** Realtime model id used by the session. */
  model?: string;
  /** Object type, normally realtime.session. */
  object: 'realtime.session';
  /** Voice identifier for realtime audio output. */
  voice?: string;
}
