import type { KlingElementReference } from './kling-element-reference';
import type { KlingWatermarkInfo } from './kling-watermark-info';
import type { ProviderJsonValue } from './provider-json-value';

/** Kling image generation request (`POST /v1/images/generations`). */
export interface KlingImageGenerationRequest {
  /** Output aspect ratio. */
  aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9';
  /** Callback URL notified when the task changes state. */
  callback_url?: string;
  /** Subject references from the Kling element library. */
  element_list?: KlingElementReference[];
  /** Caller-supplied task id, unique per account. */
  external_task_id?: string;
  /** Face similarity strength; vendor default 0.45. */
  human_fidelity?: number;
  /** Reference image URL or Base64 string without a data-URL prefix. */
  image?: string;
  /** Reference strength for the uploaded image; vendor default 0.5. */
  image_fidelity?: number;
  /** How the reference image is used. */
  image_reference?: 'subject' | 'face';
  /** Kling image model name; the vendor default is `kling-v3`. */
  model_name?: 'kling-v2-1' | 'kling-v3';
  /** Number of images to generate. */
  n?: number;
  /** Negative prompt. */
  negative_prompt?: string;
  /** Positive prompt; at most 2500 characters. */
  prompt: string;
  /** Output resolution tier. */
  resolution?: '1k' | '2k';
  /** Watermark configuration. */
  watermark_info?: KlingWatermarkInfo;
}
