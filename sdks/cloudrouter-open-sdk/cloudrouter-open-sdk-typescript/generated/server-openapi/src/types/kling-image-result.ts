import type { ProviderJsonValue } from './provider-json-value';

/** One generated Kling image. */
export interface KlingImageResult {
  /** Zero-based image index within the task. */
  index?: number;
  /** Image URL; Kling retains results for 30 days. */
  url?: string;
}
