import type { ProviderJsonValue } from './provider-json-value';

/** Kling-compatible kling motion control request schema exposed by Cloud Router vendor routing. */
export interface KlingMotionControlRequest {
  /** Optional callback URL. */
  callback_url?: string;
  /** Character image URL whose person performs the motion. */
  image: string;
  /** Kling model id, for example kling-v2-6 or kling-v3. */
  model_name?: string;
  /** Optional text prompt for global or local motion control. */
  prompt?: string;
  /** Motion reference video URL (single-person performance, 3-30 seconds). */
  video: string;
}
