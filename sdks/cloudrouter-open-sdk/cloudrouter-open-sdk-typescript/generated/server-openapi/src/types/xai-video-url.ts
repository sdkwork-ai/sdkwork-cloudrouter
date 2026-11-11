import type { ProviderJsonValue } from './provider-json-value';

/** An xAI video input or output reference. Provide `url` or `file_id` when used as an input. */
export interface XaiVideoUrl {
  /** Duration of the video in seconds when returned by xAI. */
  duration?: number;
  /** File ID from the xAI Files API; mutually exclusive with `url`. */
  file_id?: string;
  /** Public URL or base64 data URL of the video. */
  url?: string;
}
