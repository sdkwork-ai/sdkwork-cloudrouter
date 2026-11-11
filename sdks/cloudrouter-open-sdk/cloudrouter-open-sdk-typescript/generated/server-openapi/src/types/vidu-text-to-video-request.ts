import type { ProviderJsonValue } from './provider-json-value';

/** Vidu vidu text to video request schema exposed by Cloud Router vendor routing. */
export interface ViduTextToVideoRequest {
  /** Requested output aspect ratio. */
  aspect_ratio?: string;
  /** Whether Vidu produces synchronized audio. */
  audio?: boolean;
  /** Optional callback URL sent to Vidu. */
  callback_url?: string;
  /** Requested video duration in seconds when supported by the selected Vidu model. */
  duration?: number;
  /** JSON metadata string forwarded to Vidu. */
  meta_data?: string;
  /** Vidu model name accepted by the upstream account. */
  model: string;
  /** Off-peak generation at a lower price; completed within 48 hours. */
  off_peak?: boolean;
  /** Opaque payload forwarded to Vidu and echoed back by task queries. */
  payload?: string;
  /** Text prompt sent to the Vidu API. */
  prompt: string;
  /** Requested output resolution when supported. */
  resolution?: string;
  /** Optional deterministic seed. */
  seed?: string;
  /** Whether the output carries the Vidu watermark. */
  watermark?: boolean;
  /** Watermark position: 1 top-right, 2 top-left, 3 bottom-right, 4 bottom-left. */
  wm_position?: number;
  /** Custom watermark image URL. */
  wm_url?: string;
}
