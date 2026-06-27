import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible multipart request to upload a certificate. */
export interface OpenAiCertificateUploadMultipartRequest {
  /** Certificate file when the upstream expects this form field. */
  certificate?: Blob;
  /** Certificate file. */
  file: Blob;
  /** JSON-serialized certificate metadata. */
  metadata?: string;
  /** Human-readable certificate name. */
  name?: string;
}
