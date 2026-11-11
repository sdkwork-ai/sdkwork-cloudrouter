import type { ProviderJsonValue } from './provider-json-value';
import type { XaiGeneratedImage } from './xai-generated-image';
import type { XaiUsage } from './xai-usage';

/** xAI generated-image response (GeneratedImageResponse). */
export interface XaiImageGenerationResponse {
  /** Generated image objects. */
  data: XaiGeneratedImage[];
  /** Usage field on the xai image generation response, using the xai usage module. */
  usage?: XaiUsage;
}
