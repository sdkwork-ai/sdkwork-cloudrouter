import type { ProviderJsonValue } from './provider-json-value';

/** Stability AI image generation response. */
export interface StabilityImageGenerationResponse {
  /** Why generation stopped, for example SUCCESS or CONTENT_FILTERED. */
  finish_reason?: string;
  /** Base64-encoded generated image bytes. */
  image?: string;
  /** Seed the provider actually used. */
  seed?: number;
}
