import type { OpenAiRealtimeClientSecretValue } from './open-ai-realtime-client-secret-value';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible realtime translation session object. */
export interface OpenAiRealtimeTranslationSession {
  /** Client secret field on the open ai realtime translation session, using the open ai realtime client secret value module. */
  client_secret?: OpenAiRealtimeClientSecretValue;
  /** Realtime translation session identifier. */
  id: string;
  /** Object type, normally realtime.translation_session. */
  object: 'realtime.translation_session';
  /** Source language for realtime translation. */
  source_language?: string;
  /** Target language for realtime translation. */
  target_language?: string;
}
