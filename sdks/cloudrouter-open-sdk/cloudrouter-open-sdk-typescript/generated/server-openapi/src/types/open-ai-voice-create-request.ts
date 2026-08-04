import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a voice. */
export interface OpenAiVoiceCreateRequest {
  /** Human-readable voice description. */
  description?: string;
  /** Developer-defined voice metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable voice name. */
  name?: string;
}
