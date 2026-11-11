import type { ArkImageGenerationData } from './ark-image-generation-data';
import type { ArkImageUsage } from './ark-image-usage';
import type { ArkWebSearchTool } from './ark-web-search-tool';
import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderTaskError } from './provider-task-error';

/** ByteDance Ark image generation response. */
export interface BytedanceImageGenerationResponse {
  /** Request creation time as a Unix timestamp in seconds. */
  created?: number;
  /** Generated image records. */
  data?: ArkImageGenerationData[];
  /** Top-level error returned when the request produced no image at all. */
  error?: ProviderTaskError;
  /** Model id that served the request. */
  model?: string;
  /** Tools the model actually called. */
  tools?: ArkWebSearchTool[];
  /** Generated image usage. */
  usage?: ArkImageUsage;
}
