import type { ProviderJsonValue } from './provider-json-value';

/** Watermark configuration for a Kling generation. */
export interface KlingWatermarkInfo {
  /** When true the vendor also produces a watermarked result. */
  enabled?: boolean;
}
