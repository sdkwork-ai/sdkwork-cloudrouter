import type { ProviderJsonValue } from './provider-json-value';

/** Kling motion control (motion mimicry) video generation request schema exposed by Cloud Router vendor routing. */
export interface KlingMotionControlRequest {
  /** Kling model id, for example kling-v2-6 or kling-v3. */
  model_name?: string;
  /** Optional text prompt for global or local motion control. */
  prompt?: string;
  /** Character image URL whose person performs the motion. */
  image: string;
  /** Motion reference video URL (single-person performance, 3-30 seconds). */
  video: string;
  /** Optional callback URL. */
  callback_url?: string;
}
