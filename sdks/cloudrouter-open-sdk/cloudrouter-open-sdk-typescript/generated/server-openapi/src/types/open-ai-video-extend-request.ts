import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to extend a video (`POST /v1/videos/extensions`). */
export interface OpenAiVideoExtendRequest {
  /** Text prompt describing the extension. */
  prompt: string;
  /** Extension duration in seconds (allowed values: 4, 8, 12, 16, 20). */
  seconds: '4' | '8' | '12' | '16' | '20';
  /** Source video reference, URL, file id, or provider-specific video payload. */
  video: ProviderJsonValue;
}
