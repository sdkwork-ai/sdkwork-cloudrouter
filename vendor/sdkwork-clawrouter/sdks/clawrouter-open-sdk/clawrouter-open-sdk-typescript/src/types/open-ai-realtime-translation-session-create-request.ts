import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a realtime translation session. */
export interface OpenAiRealtimeTranslationSessionCreateRequest {
  /** Developer-defined realtime metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Realtime translation model id or Claw Router catalog key. */
  model?: string;
  /** Source language for realtime translation. */
  source_language?: string;
  /** Target language for realtime translation. */
  target_language?: string;
}
