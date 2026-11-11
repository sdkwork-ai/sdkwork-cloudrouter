import type { ArkWebSearchTool } from './ark-web-search-tool';
import type { ProviderJsonValue } from './provider-json-value';

/** Volcengine Ark image generation request (`POST /api/v3/images/generations`). */
export interface VolcengineImageGenerationRequest {
  /** Transparent-background mode. Requires a single transparent input image and forces PNG output. */
  background?: 'transparent' | 'opaque';
  /** Optional reference image or images. Layer decomposition accepts exactly one image. */
  image?: string | string[];
  /** When true the model splits the input image into one base image plus up to 16 transparent PNG layers. */
  layer_decomposition?: boolean;
  /** Volcengine Ark image model id or endpoint id, for example doubao-seedream-5-0-pro-260628. */
  model: string;
  /** Prompt optimization configuration. */
  optimize_prompt_options?: { mode?: 'standard' | 'fast'; } & Record<string, ProviderJsonValue>;
  /** Output image format. Layer decomposition only applies this to the base image; layers are always PNG. */
  output_format?: 'png' | 'jpeg';
  /** Image prompt. Required for image generation; optional for layer decomposition, where omitting it lets the model pick every major element. */
  prompt?: string;
  /** Return a download URL or inline Base64 image data. */
  response_format?: 'url' | 'b64_json';
  /** Grouped-image generation: `auto` lets the model decide whether and how many images to return. */
  sequential_image_generation?: 'auto' | 'disabled';
  /** Grouped-image configuration; only effective when `sequential_image_generation` is `auto`. */
  sequential_image_generation_options?: { max_images?: number; } & Record<string, ProviderJsonValue>;
  /** Output size: a resolution tier such as `1K`, `1.5K`, `2K`, or `4K`, or explicit `<width>x<height>` pixels. Do not mix both forms. */
  size?: string;
  /** When true the response streams one event per generated image instead of one final body. */
  stream?: boolean;
  /** Tools the model may call while generating the image. */
  tools?: ArkWebSearchTool[];
  /** When true the vendor adds its AI-generated watermark to the image. */
  watermark?: boolean;
}
