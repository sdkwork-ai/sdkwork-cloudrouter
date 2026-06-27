import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible voice object. */
export interface OpenAiVoice {
  /** Unix timestamp in seconds when the voice was created. */
  created_at?: string;
  /** Human-readable voice description. */
  description?: string;
  /** Voice identifier. */
  id: string;
  /** Developer-defined voice metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable voice name. */
  name?: string;
  /** Object type, normally voice. */
  object: 'voice';
  /** Voice lifecycle status. */
  status?: string;
}
