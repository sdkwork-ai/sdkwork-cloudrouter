import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax generated-image envelope. */
export interface MinimaxImageData {
  /** Base64 images when `response_format` is base64. */
  image_base64?: string[];
  /** Image links when `response_format` is url. */
  image_urls?: string[];
}
