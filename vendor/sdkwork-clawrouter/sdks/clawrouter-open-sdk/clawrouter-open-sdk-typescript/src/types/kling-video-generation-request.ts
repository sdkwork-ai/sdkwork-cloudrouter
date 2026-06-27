import type { ProviderJsonValue } from './provider-json-value';

/** Kling-compatible kling video generation request schema exposed by Claw Router vendor routing. */
export interface KlingVideoGenerationRequest {
  /** Requested aspect ratio. */
  aspect_ratio?: string;
  /** Optional callback URL. */
  callback_url?: string;
  /** Prompt guidance scale. */
  cfg_scale?: number;
  /** Requested video duration in seconds. */
  duration?: number;
  /** Optional source image URL or asset reference. */
  image?: string;
  /** Optional ending image URL or asset reference. */
  image_tail?: string;
  /** Generation mode. */
  mode?: string;
  /** Kling model identifier. */
  model?: string;
  /** Negative prompt. */
  negative_prompt?: string;
  /** Video prompt sent to the Kling-compatible provider. */
  prompt: string;
}
