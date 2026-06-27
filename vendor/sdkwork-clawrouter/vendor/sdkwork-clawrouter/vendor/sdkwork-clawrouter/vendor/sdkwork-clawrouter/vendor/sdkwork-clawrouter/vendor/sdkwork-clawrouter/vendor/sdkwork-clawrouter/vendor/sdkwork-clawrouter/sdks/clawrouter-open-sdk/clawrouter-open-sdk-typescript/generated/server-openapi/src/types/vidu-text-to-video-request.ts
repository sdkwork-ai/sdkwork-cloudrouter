import type { ProviderJsonValue } from './provider-json-value';

/** Vidu vidu text to video request schema exposed by Claw Router vendor routing. */
export interface ViduTextToVideoRequest {
  /** Requested output aspect ratio. */
  aspect_ratio?: string;
  /** Optional callback URL sent to Vidu. */
  callback_url?: string;
  /** Requested video duration in seconds when supported by the selected Vidu model. */
  duration?: number;
  /** Vidu model name accepted by the upstream account. */
  model: string;
  /** Vidu movement amplitude option when supported. */
  movement_amplitude?: string;
  /** Optional provider callback payload sent to Vidu. */
  payload?: string;
  /** Text prompt sent to the Vidu API. */
  prompt: string;
  /** Requested output resolution when supported. */
  resolution?: string;
  /** Optional deterministic seed. */
  seed?: string;
}
