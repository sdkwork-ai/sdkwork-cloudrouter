import type { ProviderJsonValue } from './provider-json-value';

/** Structured file reference used when a JSON endpoint accepts uploaded, hosted, or inline file input. */
export interface OpenAiFileReferenceObject {
  /** Inline base64 or provider-compatible file data. */
  file_data?: string;
  /** Uploaded file identifier. */
  file_id?: string;
  /** Input filename when sending inline file data. */
  filename?: string;
  /** MIME type of the referenced file. */
  mime_type?: string;
  /** Hosted file URL or data URL. */
  url?: string;
}
