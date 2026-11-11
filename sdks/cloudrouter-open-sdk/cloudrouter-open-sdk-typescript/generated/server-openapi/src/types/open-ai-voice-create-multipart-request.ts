import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible multipart request to create a voice. */
export interface OpenAiVoiceCreateMultipartRequest {
  /** Binary voice sample or voice package. */
  file?: Blob;
  /** Voice model id. */
  model?: string;
  /** Human-readable voice name. */
  name?: string;
  /** Description of the desired voice. */
  prompt?: string;
  /** Optional text the voice speaks during creation. */
  script_hint?: string;
  /** Creation mode; only `prompt` is supported. */
  type?: 'prompt';
}
