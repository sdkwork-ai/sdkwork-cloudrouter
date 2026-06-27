import type { ProviderJsonValue } from './provider-json-value';

/** Vidu vidu reference to image request schema exposed by Claw Router vendor routing. */
export interface ViduReferenceToImageRequest {
  /** Requested output aspect ratio. */
  aspect_ratio?: string;
  /** Optional callback URL sent to Vidu. */
  callback_url?: string;
  /** Reference image URLs or Vidu-supported image references. */
  images: string[];
  /** Vidu image model name accepted by the upstream account. */
  model: string;
  /** Optional provider callback payload sent to Vidu. */
  payload?: string;
  /** Text prompt sent to the Vidu API. */
  prompt: string;
  /** Optional deterministic seed. */
  seed?: string;
  /** Provider-specific image style option when supported. */
  style?: string;
}
