import type { ProviderJsonValue } from './provider-json-value';

/** Vidu vidu start end to video request schema exposed by Claw Router vendor routing. */
export interface ViduStartEndToVideoRequest {
  /** Requested output aspect ratio. */
  aspect_ratio?: string;
  /** Optional callback URL sent to Vidu. */
  callback_url?: string;
  /** Requested video duration in seconds when supported by the selected Vidu model. */
  duration?: number;
  /** Start and end image URLs or Vidu-supported image references. */
  images: string[];
  /** Vidu model name accepted by the upstream account. */
  model: string;
  /** Vidu movement amplitude option when supported. */
  movement_amplitude?: string;
  /** Optional provider callback payload sent to Vidu. */
  payload?: string;
  /** Text prompt sent to the Vidu API. */
  prompt?: string;
  /** Requested output resolution when supported. */
  resolution?: string;
  /** Optional deterministic seed. */
  seed?: string;
}
