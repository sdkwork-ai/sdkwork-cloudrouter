import type { ProviderJsonValue } from './provider-json-value';

/** Zhipu GLM-Image / CogView image generation request (`POST /api/paas/v4/images/generations`). */
export interface ZhipuImageGenerationRequest {
  /** Image model code. */
  model: 'glm-image' | 'cogview-4-250304' | 'cogview-4' | 'cogview-3-flash';
  /** Text prompt describing the requested image. */
  prompt: string;
  /** Output quality; `glm-image` supports only `hd`. */
  quality?: 'hd' | 'standard';
  /** Output size such as `1280x1280`; allowed enum values and pixel bounds depend on the model. */
  size?: string;
  /** Stable end-user identifier for abuse attribution. */
  user_id?: string;
  /** Whether the vendor adds explicit and implicit AI watermarks. */
  watermark_enabled?: boolean;
}
