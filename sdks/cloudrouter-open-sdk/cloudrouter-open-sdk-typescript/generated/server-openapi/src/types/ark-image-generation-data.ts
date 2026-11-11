import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderTaskError } from './provider-task-error';

/** One generated image record returned by Ark. */
export interface ArkImageGenerationData {
  /** Base64 image data, returned when `response_format` is `b64_json`. */
  b64_json?: string;
  /** Layer bounding box in layer-decomposition mode. */
  bounding_box?: { absolute?: number[]; normalized?: number[]; } & Record<string, ProviderJsonValue>;
  /** Layer description in layer-decomposition mode. */
  description?: string;
  /** Per-image failure details in grouped-image mode; other images are unaffected. */
  error?: ProviderTaskError;
  /** Layer name in layer-decomposition mode. */
  name?: string;
  /** Actual output image format. */
  output_format?: 'png' | 'jpeg';
  /** Image size as `<width>x<height>` in pixels. */
  size?: string;
  /** Download URL, returned when `response_format` is `url`. */
  url?: string;
  /** Layer stacking index in layer-decomposition mode; the base image is 0. */
  z_index?: number;
}
