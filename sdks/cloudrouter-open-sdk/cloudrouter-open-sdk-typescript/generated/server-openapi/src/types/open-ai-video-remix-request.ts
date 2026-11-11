import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to remix a video (`POST /v1/videos/{video_id}/remix`). */
export interface OpenAiVideoRemixRequest {
  /** Text prompt describing the remix. */
  prompt: string;
}
