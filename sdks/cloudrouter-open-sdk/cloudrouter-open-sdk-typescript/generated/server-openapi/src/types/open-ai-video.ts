import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible video object. */
export interface OpenAiVideo {
  /** Unix timestamp in seconds when the video completed. */
  completed_at?: string;
  /** URL for video bytes when returned separately. */
  content_url?: string;
  /** Unix timestamp in seconds when the video was created. */
  created_at?: string;
  /** Video identifier. */
  id: string;
  /** Developer-defined or provider-returned video metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Video model used by the upstream. */
  model?: string;
  /** Object type, normally video. */
  object: 'video';
  /** Prompt used for the video request. */
  prompt?: string;
  /** Generated or requested duration in seconds. */
  seconds?: number;
  /** Generated or requested video size. */
  size?: string;
  /** Video lifecycle status. */
  status: string;
  /** Generated video URL when returned by the upstream. */
  url?: string;
}
