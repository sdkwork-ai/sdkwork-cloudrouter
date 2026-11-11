import type { ProviderJsonValue } from './provider-json-value';
import type { XaiVideoInput } from './xai-video-input';

/** xAI video extension request (ExtendVideoRequest). */
export interface XaiVideoExtensionRequest {
  /** Duration of the extension segment in seconds; defaults to 6. */
  duration?: number;
  /** Model to be used. */
  model?: string;
  /** Optional output destination for the extended video. */
  output?: Record<string, ProviderJsonValue>;
  /** Prompt describing what should happen next in the video. */
  prompt: string;
  /** Optional output storage configuration. */
  storage_options?: Record<string, ProviderJsonValue>;
  /** Video field on the xai video extension request, using the xai video input module. */
  video: XaiVideoInput;
}
