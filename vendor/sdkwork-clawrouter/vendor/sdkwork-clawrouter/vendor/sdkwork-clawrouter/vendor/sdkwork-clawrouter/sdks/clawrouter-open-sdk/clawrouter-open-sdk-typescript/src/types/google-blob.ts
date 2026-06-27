import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google blob schema exposed by Claw Router vendor routing. */
export interface GoogleBlob {
  /** Base64-encoded binary content. */
  data?: string;
  /** IANA MIME type for the inline data. */
  mimeType?: string;
}
