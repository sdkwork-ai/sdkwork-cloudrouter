import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax image generation request (union of the legacy text-to-image and image-to-image `/v1/image_generation` variants). */
export interface MinimaxImageGenerationRequest {
  /** Requested aspect ratio. */
  aspect_ratio?: '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9';
  /** Output height in pixels when aspect_ratio is omitted. */
  height?: number;
  /** MiniMax image model id. */
  model: 'image-01' | 'image-01-live';
  /** Number of images to generate. */
  n?: number;
  /** Text prompt describing the requested image. */
  prompt: string;
  /** Whether the provider rewrites the prompt for more detail. */
  prompt_optimizer?: boolean;
  /** Response format: url or base64. */
  response_format?: 'url' | 'base64';
  /** Optional deterministic seed. */
  seed?: number;
  /** Subject reference images for image-to-image (image-01-live). */
  subject_reference?: Record<string, ProviderJsonValue>[];
  /** Output width in pixels when aspect_ratio is omitted. */
  width?: number;
}
