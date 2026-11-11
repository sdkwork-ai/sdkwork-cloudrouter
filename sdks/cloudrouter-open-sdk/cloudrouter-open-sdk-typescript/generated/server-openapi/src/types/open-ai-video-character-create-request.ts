import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a reusable video character. */
export interface OpenAiVideoCharacterCreateRequest {
  /** Human-readable character description. */
  description?: string;
  /** Reference image URL, file id, or provider-specific image payload. */
  image?: ProviderJsonValue;
  /** Developer-defined character metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable character name. */
  name?: string;
}
