import type { ProviderJsonValue } from './provider-json-value';

/** xAI video input for edit and extension requests; provide `url` or `file_id`. */
export interface XaiVideoInput {
  /** File ID from the xAI Files API; mutually exclusive with `url`. */
  file_id?: string;
  /** Public URL or base64 data URL of the video. */
  url?: string;
}
