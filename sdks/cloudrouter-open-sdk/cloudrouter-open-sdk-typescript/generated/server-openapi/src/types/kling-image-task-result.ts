import type { KlingImageResult } from './kling-image-result';
import type { ProviderJsonValue } from './provider-json-value';

/** Kling image task output. */
export interface KlingImageTaskResult {
  /** Generated images. */
  images?: KlingImageResult[];
}
