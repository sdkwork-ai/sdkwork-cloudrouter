import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai voice consent multipart request schema exposed by Claw Router. */
export interface OpenAiVoiceConsentMultipartRequest {
  /** Voice consent file. */
  file: Blob;
  /** Provider-specific metadata for the voice consent. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable voice consent name. */
  name?: string;
}
