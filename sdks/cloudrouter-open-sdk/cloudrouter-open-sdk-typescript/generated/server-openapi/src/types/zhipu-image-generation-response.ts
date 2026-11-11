import type { ProviderJsonValue } from './provider-json-value';
import type { ZhipuContentFilter } from './zhipu-content-filter';
import type { ZhipuImageResult } from './zhipu-image-result';

/** Zhipu image generation response. */
export interface ZhipuImageGenerationResponse {
  /** Content-safety verdicts. */
  content_filter?: ZhipuContentFilter[];
  /** Request creation time as a Unix timestamp in seconds. */
  created?: number;
  /** Generated image records; the current API returns one image. */
  data?: ZhipuImageResult[];
}
