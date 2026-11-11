import type { ProviderJsonValue } from './provider-json-value';

/** An xAI image input: a public URL, a base64 data URL, or an xAI Files API id. */
export interface XaiImageUrl {
  /** File ID from the xAI Files API; mutually exclusive with url. */
  file_id?: string;
  /** Public URL or base64 data URL of the image (JPEG, PNG, or WebP). The vendor also accepts image_url for compatibility. */
  url?: string;
}
