import type { ProviderJsonValue } from './provider-json-value';

/** xAI Grok Imagine image generation request (GenerateImageRequest). */
export interface XaiImageGenerationRequest {
  /** Aspect ratio of the generated image; auto picks the best ratio for the prompt. Only supported by grok-imagine models. */
  aspect_ratio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '2:3' | '3:2' | '9:19.5' | '19.5:9' | '9:20' | '20:9' | '1:2' | '2:1' | '21:9' | '5:2' | 'auto';
  /** When set, the request returns immediately with a request_id and the image is generated in the background; poll GET /xai/v1/images/{request_id}. */
  deferred?: boolean;
  /** Model to be used, for example grok-imagine-image-2.0. */
  model?: string;
  /** Number of images to be generated. */
  n?: number;
  /** Optional output destination: each generated image is uploaded via HTTP PUT to the matching signed URL instead of xAI-hosted storage. */
  output?: Record<string, ProviderJsonValue>;
  /** Prompt for image generation. */
  prompt: string;
  /** Resolution of the generated image; defaults to 1k and is only supported by grok-imagine models. */
  resolution?: '1k' | '1.5k' | '2k';
  /** Response format to return the image in. */
  response_format?: 'url' | 'b64_json';
  /** Optional output storage configuration; generated images are stored in the Files API. */
  storage_options?: Record<string, ProviderJsonValue>;
  /** Unique identifier representing the end-user, for abuse monitoring. */
  user?: string;
}
