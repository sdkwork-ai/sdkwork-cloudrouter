import type { ProviderJsonValue } from './provider-json-value';
import type { XaiVideoInput } from './xai-video-input';

/** xAI video edit request (EditVideoRequest). */
export interface XaiVideoEditRequest {
  /** Model to be used. */
  model?: string;
  /** Optional output destination for the edited video. */
  output?: Record<string, ProviderJsonValue>;
  /** Prompt for video editing. */
  prompt: string;
  /** Optional output storage configuration. */
  storage_options?: Record<string, ProviderJsonValue>;
  /** Unique identifier representing the end-user. */
  user?: string;
  /** Video field on the xai video edit request, using the xai video input module. */
  video: XaiVideoInput;
}
