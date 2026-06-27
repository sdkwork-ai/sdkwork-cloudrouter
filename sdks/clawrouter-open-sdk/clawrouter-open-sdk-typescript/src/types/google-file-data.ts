import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google file data schema exposed by Claw Router vendor routing. */
export interface GoogleFileData {
  /** Gemini file URI. */
  fileUri?: string;
  /** IANA MIME type for the referenced file. */
  mimeType?: string;
}
