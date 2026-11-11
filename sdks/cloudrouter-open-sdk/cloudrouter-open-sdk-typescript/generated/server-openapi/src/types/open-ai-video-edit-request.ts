import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to edit a video (`POST /v1/videos/edits`). */
export interface OpenAiVideoEditRequest {
  /** Text prompt describing the edit. */
  prompt: string;
  /** Source video reference, URL, file id, or provider-specific video payload. */
  video: ProviderJsonValue;
}
