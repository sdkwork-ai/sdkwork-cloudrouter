import type { ProviderJsonValue } from './provider-json-value';
import type { XaiImageUrl } from './xai-image-url';

/** xAI Grok Imagine video generation request (GenerateVideoRequest). prompt is required for text-to-video and reference-to-video and optional when image supplies the first frame. */
export interface XaiVideoGenerationRequest {
  /** Aspect ratio of the generated video. */
  aspect_ratio?: string;
  /** Video duration in seconds; default 8. The vendor also accepts seconds for OpenAI API compatibility. */
  duration?: number;
  /** Image field on the xai video generation request, using the xai image url module. */
  image?: XaiImageUrl;
  /** Optional mid-video keyframe anchors, strictly between the endpoint pins. */
  keyframes?: XaiImageUrl[];
  /** Model to be used, for example grok-imagine-video-1.5. */
  model?: string;
  /** Optional output destination for the generated video. */
  output?: Record<string, ProviderJsonValue>;
  /** Prompt for video generation. */
  prompt?: string;
  /** Optional reference audio clips (voice identity) for reference-to-video generation. */
  reference_audios?: string[];
  /** Optional reference images for reference-to-video generation. */
  reference_images?: XaiImageUrl[];
  /** Resolution of the generated video. */
  resolution?: string;
  /** Optional output storage configuration. */
  storage_options?: Record<string, ProviderJsonValue>;
  /** Unique identifier representing the end-user. */
  user?: string;
}
