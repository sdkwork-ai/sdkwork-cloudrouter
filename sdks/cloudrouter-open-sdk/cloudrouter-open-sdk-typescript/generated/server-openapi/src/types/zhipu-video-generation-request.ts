import type { ProviderJsonValue } from './provider-json-value';

/** Zhipu CogVideoX video generation request (`POST /api/paas/v4/videos/generations`). `prompt` or `image_url` must be supplied. */
export interface ZhipuVideoGenerationRequest {
  /** Video duration in seconds. */
  duration?: 5 | 10;
  /** Frame rate. */
  fps?: 30 | 60;
  /** First-frame image, first/last-frame pair, or Base64 payload. */
  image_url?: string | string | string[];
  /** Video model code, for example `cogvideox-3`. */
  model: string;
  /** Text prompt; at most 512 characters. `prompt` and `image_url` cannot both be empty. */
  prompt?: string;
  /** Output mode: speed-first or quality-first. */
  quality?: 'speed' | 'quality';
  /** Client-supplied unique request id. */
  request_id?: string;
  /** Output size such as `1920x1080`; the allowed set depends on the model. */
  size?: string;
  /** Stable end-user identifier for abuse attribution. */
  user_id?: string;
  /** Whether the vendor adds explicit and implicit AI watermarks. */
  watermark_enabled?: boolean;
  /** Generate an AI audio track. */
  with_audio?: boolean;
}
