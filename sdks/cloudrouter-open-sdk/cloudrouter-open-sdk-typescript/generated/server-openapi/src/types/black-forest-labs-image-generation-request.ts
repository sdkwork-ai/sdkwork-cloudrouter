import type { ProviderJsonValue } from './provider-json-value';

/** Black Forest Labs FLUX image generation request (union of the vendor's per-model `/v1/flux-*` request variants). */
export interface BlackForestLabsImageGenerationRequest {
  /** Requested aspect ratio such as 16:9; it takes precedence over width and height. */
  aspect_ratio?: string;
  /** Auto-crop the result to the requested aspect ratio. */
  auto_crop?: boolean;
  /** Pixels to expand below the image. */
  bottom?: number;
  /** Mask dilation in pixels for erase operations. */
  dilate_pixels?: number;
  /** Disable prompt upsampling for this request. */
  disable_pup?: boolean;
  /** Finetune id applied to the generation. */
  finetune_id?: string;
  /** Strength of the finetune. */
  finetune_strength?: number;
  /** Garment image for virtual try-on. */
  garment?: string;
  /** Ground the generation in the input image. */
  grounding?: boolean;
  /** Classifier-free guidance scale. */
  guidance?: number;
  /** Output height in pixels. */
  height?: number;
  /** Base64-encoded image to modify; may contain an alpha mask. */
  image?: string;
  /** Base64-encoded image used with FLUX Redux. */
  image_prompt?: string;
  /** Strength of the image prompt. */
  image_prompt_strength?: number;
  /** Reference image URL(s) or base64 payload(s); one to ten total. */
  images?: string | string[];
  /** Path to the input image. */
  input_image?: string;
  /** Second input image. */
  input_image_2?: string;
  /** Third input image. */
  input_image_3?: string;
  /** Fourth input image. */
  input_image_4?: string;
  /** Fifth input image. */
  input_image_5?: string;
  /** Sixth input image. */
  input_image_6?: string;
  /** Seventh input image. */
  input_image_7?: string;
  /** Eighth input image. */
  input_image_8?: string;
  /** Blob path of an uploaded input image. */
  input_image_blob_path?: string;
  /** Pixels to expand on the left. */
  left?: number;
  /** Base64-encoded mask for inpainting or erasing. */
  mask?: string;
  /** Generation mode for models that trade quality for speed. */
  mode?: 'high' | 'fast';
  /** Requested output format. */
  output_format?: 'jpeg' | 'png' | 'webp';
  /** Person image for virtual try-on. */
  person?: string;
  /** Text prompt describing the requested image. */
  prompt: string;
  /** Whether the provider rewrites the prompt for more detail. */
  prompt_upsampling?: boolean;
  /** Return raw output without post-processing. */
  raw?: boolean;
  /** Left offset of the reference image on the output canvas; negative values allowed. */
  reference_offset_x?: number;
  /** Top offset of the reference image on the output canvas; negative values allowed. */
  reference_offset_y?: number;
  /** Output resolution tier for the FLUX 2 / 3 models. */
  resolution?: '768sq' | '1k' | '1.5k' | '2k' | '4k' | 'match_input';
  /** Pixels to expand on the right. */
  right?: number;
  /** Moderation strictness from 0 (strictest) to 6. */
  safety_tolerance?: number;
  /** Optional deterministic seed. */
  seed?: number;
  /** Number of diffusion steps. */
  steps?: number;
  /** Pixels to expand above the image. */
  top?: number;
  /** Opaque end-user identifier. */
  user?: string;
  /** Endpoint version: `latest` or a dated release. */
  version?: string;
  /** Optional secret for webhook signature verification. */
  webhook_secret?: string;
  /** URL that receives webhook notifications. */
  webhook_url?: string;
  /** Output width in pixels. */
  width?: number;
}
