import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible multipart request to create a reusable video character. */
export interface OpenAiVideoCharacterMultipartRequest {
  /** Human-readable character description. */
  description?: string;
  /** Binary character reference image. */
  file?: Blob;
  /** Character reference image when required by the selected upstream. */
  image?: Blob;
  /** JSON-serialized character metadata. */
  metadata?: string;
  /** Human-readable character name. */
  name?: string;
}
