import type { ProviderJsonValue } from './provider-json-value';

/** Stability AI Stable Image generation request (union of the `core`, `ultra`, and `sd3` multipart variants). */
export interface StabilityImageGenerationRequest {
  /** Requested aspect ratio. */
  aspect_ratio?: '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Classifier-free guidance scale for SD3. */
  cfg_scale?: number;
  /** Optional source image for image-to-image modes. */
  image?: string;
  /** SD3 generation mode. */
  mode?: 'text-to-image' | 'image-to-image';
  /** SD3.5 model variant; the path mode selects the endpoint. */
  model?: 'sd3.5-large' | 'sd3.5-large-turbo' | 'sd3.5-medium';
  /** Content the model should avoid. */
  negative_prompt?: string;
  /** Requested output format. */
  output_format?: 'png' | 'jpeg' | 'webp';
  /** Text prompt describing the requested image. */
  prompt: string;
  /** Optional deterministic seed; 0 randomizes. */
  seed?: number;
  /** Image-to-image transformation strength between 0 and 1. */
  strength?: number;
  /** Named style preset applied to the generation. */
  style_preset?: string;
}
