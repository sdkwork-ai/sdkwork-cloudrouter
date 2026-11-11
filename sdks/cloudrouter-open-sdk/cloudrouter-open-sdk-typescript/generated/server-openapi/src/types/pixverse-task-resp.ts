import type { ProviderJsonValue } from './provider-json-value';

/** PixVerse task payload shared by creation and polling. */
export interface PixverseTaskResp {
  /** Task aspect ratio. */
  aspect_ratio?: string;
  /** Task creation timestamp. */
  create_time?: string;
  /** Credits consumed by the task. */
  credits?: number;
  /** Capability-specific metadata. */
  customer_paths?: Record<string, ProviderJsonValue>;
  /** Service task duration. */
  duration?: number;
  /** Whether the result includes audio. */
  has_audio?: boolean;
  /** Task id returned by the result endpoint. */
  id?: number;
  /** Last update timestamp. */
  modify_time?: string;
  /** Task negative prompt. */
  negative_prompt?: string;
  /** Output height; may be 0 while processing. */
  outputHeight?: number;
  /** Output width; may be 0 while processing. */
  outputWidth?: number;
  /** Service path. */
  path?: string;
  /** Task prompt. */
  prompt?: string;
  /** Output quality. */
  quality?: string;
  /** Service resolution field. */
  resolution_ratio?: number;
  /** Generation seed. */
  seed?: number;
  /** Service size field. */
  size?: number;
  /** 1 completed, 5 generating, 7 moderation failed, 8 generation failed. */
  status?: 1 | 5 | 7 | 8;
  /** Style identifier. */
  style?: string;
  /** Output URL; only ready when `status` is 1. */
  url?: string;
  /** Task id returned by creation; poll it through the result endpoint. */
  video_id?: number;
}
