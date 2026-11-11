import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax Hailuo video generation task request. */
export interface MinimaxVideoGenerationRequest {
  /** Optional callback URL for task completion. */
  callback_url?: string;
  /** Requested duration in seconds. */
  duration?: number;
  /** Whether the provider shortens prompt preprocessing time. */
  fast_pretreatment?: boolean;
  /** Optional first-frame image URL or base64 payload for image-to-video. */
  first_frame_image?: string;
  /** Optional last-frame image URL or base64 payload. */
  last_frame_image?: string;
  /** MiniMax video model id. */
  model: 'MiniMax-Hailuo-2.3' | 'MiniMax-Hailuo-02' | 'T2V-01-Director' | 'T2V-01';
  /** Text prompt describing the requested video. */
  prompt: string;
  /** Whether the provider rewrites the prompt for more detail. */
  prompt_optimizer?: boolean;
  /** Requested resolution. */
  resolution?: '720P' | '768P' | '1080P';
}
