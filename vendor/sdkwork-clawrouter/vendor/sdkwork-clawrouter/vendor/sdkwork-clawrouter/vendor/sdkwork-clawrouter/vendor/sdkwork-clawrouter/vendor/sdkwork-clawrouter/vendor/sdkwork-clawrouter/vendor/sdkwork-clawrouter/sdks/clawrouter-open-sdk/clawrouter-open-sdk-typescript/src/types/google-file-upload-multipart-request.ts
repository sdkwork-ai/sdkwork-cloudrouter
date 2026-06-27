import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google file upload multipart request schema exposed by Claw Router vendor routing. */
export interface GoogleFileUploadMultipartRequest {
  /** Binary file content uploaded to Gemini. */
  file: Blob;
  /** JSON-encoded Gemini file metadata when required by the upstream upload protocol. */
  metadata?: string;
}
