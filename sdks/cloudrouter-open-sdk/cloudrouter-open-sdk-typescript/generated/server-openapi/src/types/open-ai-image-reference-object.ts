import type { ProviderJsonValue } from './provider-json-value';

/** Structured image reference used when JSON image APIs accept URL, file id, inline, or provider-specific image input. */
export interface OpenAiImageReferenceObject {
  /** Base64-encoded image bytes. */
  b64_json?: string;
  /** Image detail preference when supported. */
  detail?: string;
  /** Uploaded file identifier for the source image. */
  file_id?: string;
  /** Image MIME type. */
  mime_type?: string;
  /** Hosted image URL or data URL. */
  url?: string;
}
