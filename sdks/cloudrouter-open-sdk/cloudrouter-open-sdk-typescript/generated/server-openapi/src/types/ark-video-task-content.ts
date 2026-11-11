import type { ProviderJsonValue } from './provider-json-value';

/** Video output content of an Ark content generation task. */
export interface ArkVideoTaskContent {
  /** Last frame image URL; returned only when `return_last_frame` was true. */
  last_frame_url?: string;
  /** Generated video URL; valid for 24 hours. */
  video_url?: string;
}
