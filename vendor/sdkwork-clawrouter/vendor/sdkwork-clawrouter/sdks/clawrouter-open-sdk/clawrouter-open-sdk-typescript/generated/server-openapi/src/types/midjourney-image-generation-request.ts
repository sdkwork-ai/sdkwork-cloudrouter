import type { ProviderJsonValue } from './provider-json-value';

/** Midjourney-compatible midjourney image generation request schema exposed by Claw Router vendor routing. */
export interface MidjourneyImageGenerationRequest {
  /** Requested aspect ratio. */
  aspect_ratio?: string;
  /** Optional callback URL. */
  callback_url?: string;
  /** Model or mode identifier. */
  model?: string;
  /** Image prompt sent to the Midjourney-compatible provider. */
  prompt: string;
  /** Optional deterministic seed. */
  seed?: string;
  /** Style option. */
  style?: string;
}
