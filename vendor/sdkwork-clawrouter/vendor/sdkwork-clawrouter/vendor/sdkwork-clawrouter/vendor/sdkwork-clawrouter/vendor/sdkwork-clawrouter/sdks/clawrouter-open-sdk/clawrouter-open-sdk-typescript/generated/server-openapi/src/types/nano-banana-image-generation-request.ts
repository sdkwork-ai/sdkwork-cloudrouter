import type { ProviderJsonValue } from './provider-json-value';

/** Nano Banana compatible nano banana image generation request schema exposed by Claw Router vendor routing. */
export interface NanoBananaImageGenerationRequest {
  /** Requested aspect ratio. */
  aspect_ratio?: string;
  /** Optional callback URL. */
  callback_url?: string;
  /** Optional reference image URLs or file identifiers. */
  images?: string[];
  /** Image model identifier. */
  model?: string;
  /** Image prompt sent to the Nano Banana compatible provider. */
  prompt: string;
  /** Optional deterministic seed. */
  seed?: string;
  /** Requested image size. */
  size?: string;
}
