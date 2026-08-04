import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible multipart request to create a voice. */
export interface OpenAiVoiceCreateMultipartRequest {
  /** Human-readable voice description. */
  description?: string;
  /** Binary voice sample or voice package. */
  file?: Blob;
  /** JSON-serialized voice metadata. */
  metadata?: string;
  /** Human-readable voice name. */
  name?: string;
}
