import type { ArkVideoToolUsage } from './ark-video-tool-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** Ark image generation usage. */
export interface ArkImageUsage {
  /** Number of successfully generated images; failed images are not billed. */
  generated_images?: number;
  /** Number of input images sent to the model. */
  input_images?: number;
  /** Output tokens billed, computed as sum(width x height) / 256. */
  output_tokens?: number;
  /** Tool usage for the request. */
  tool_usage?: ArkVideoToolUsage;
  /** Total tokens for the request; input tokens are not counted, so it equals `output_tokens`. */
  total_tokens?: number;
}
