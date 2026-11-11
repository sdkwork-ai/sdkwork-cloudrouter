import type { ProviderJsonValue } from './provider-json-value';

/** One generated image, as a URL, a base64 payload, or a Files API output reference. */
export interface XaiGeneratedImage {
  /** Base64-encoded image bytes (without the data-URI prefix) when response_format is b64_json. */
  b64_json?: string;
  /** Files API reference returned when storage_options was set. */
  file_output?: Record<string, ProviderJsonValue>;
  /** MIME type of the generated image, for example image/png. */
  mime_type?: string;
  /** Human-readable error when storage_options was set but the upload failed. */
  storage_error?: string;
  /** URL of the generated image when response_format is url or omitted. */
  url?: string;
}
