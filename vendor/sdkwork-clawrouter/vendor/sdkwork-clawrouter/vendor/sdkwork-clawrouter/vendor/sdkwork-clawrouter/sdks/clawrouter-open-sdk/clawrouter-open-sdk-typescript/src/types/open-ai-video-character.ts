import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible reusable video character object. */
export interface OpenAiVideoCharacter {
  /** Unix timestamp in seconds when the character was created. */
  created_at?: string;
  /** Human-readable character description. */
  description?: string;
  /** Video character identifier. */
  id: string;
  /** Reference image URL when returned. */
  image_url?: string;
  /** Developer-defined character metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable character name. */
  name?: string;
  /** Object type, normally video.character. */
  object: 'video.character';
}
