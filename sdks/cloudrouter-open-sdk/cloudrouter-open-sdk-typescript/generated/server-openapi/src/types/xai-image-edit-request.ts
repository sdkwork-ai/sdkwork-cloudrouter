import type { ProviderJsonValue } from './provider-json-value';
import type { XaiImageUrl } from './xai-image-url';

/** xAI Grok Imagine image edit request (EditImageRequest). */
export interface XaiImageEditRequest {
  /** Aspect ratio of the output image for multi-image editing; single-image edits auto-detect it. */
  aspect_ratio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '2:3' | '3:2' | '9:19.5' | '19.5:9' | '9:20' | '20:9' | '1:2' | '2:1' | '21:9' | '5:2' | 'auto';
  /** When set, the request returns immediately with a request_id and the edit is generated in the background. */
  deferred?: boolean;
  /** Image field on the xai image edit request, using the xai image url module. */
  image?: XaiImageUrl;
  /** Input images for multi-reference editing; mutually exclusive with image. */
  images?: XaiImageUrl[];
  /** Model to be used. */
  model?: string;
  /** Number of image edits to be generated. */
  n?: number;
  /** Optional output destination for the generated images. */
  output?: Record<string, ProviderJsonValue>;
  /** Prompt for image editing. */
  prompt: string;
  /** Resolution of the edited image; defaults to 1k. */
  resolution?: '1k' | '1.5k' | '2k';
  /** Response format to return the image in. */
  response_format?: 'url' | 'b64_json';
  /** Optional output storage configuration. */
  storage_options?: Record<string, ProviderJsonValue>;
  /** Unique identifier representing the end-user, for abuse monitoring. */
  user?: string;
}
