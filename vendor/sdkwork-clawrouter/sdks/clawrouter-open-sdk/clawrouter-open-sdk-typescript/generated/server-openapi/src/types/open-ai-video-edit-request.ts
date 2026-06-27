import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to edit a video. */
export interface OpenAiVideoEditRequest {
  /** Source image reference, URL, file id, or provider-specific image payload. */
  image?: ProviderJsonValue;
  /** Developer-defined metadata attached to the video request. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Video model id or Claw Router catalog key. */
  model?: string;
  /** Text prompt describing the requested video output. */
  prompt?: string;
  /** Requested duration in seconds. */
  seconds?: number;
  /** Requested video size or resolution. */
  size?: string;
  /** Source video reference, URL, file id, or provider-specific video payload. */
  video?: ProviderJsonValue;
}
