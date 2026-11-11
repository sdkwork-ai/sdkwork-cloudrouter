import type { ProviderJsonValue } from './provider-json-value';

/** Vidu vidu reference to image request schema exposed by Cloud Router vendor routing. */
export interface ViduReferenceToImageRequest {
  /** Requested output aspect ratio. */
  aspect_ratio?: string;
  /** Whether to add generated background music. */
  bgm?: boolean;
  /** Optional callback URL sent to Vidu. */
  callback_url?: string;
  /** Reference image URLs or Vidu-supported image references. */
  images?: string[];
  /** Vidu image model name accepted by the upstream account. */
  model: string;
  /** Off-peak generation at a lower price. */
  off_peak?: boolean;
  /** Opaque payload forwarded to Vidu and echoed back by task queries. */
  payload?: string;
  /** Text prompt sent to the Vidu API. */
  prompt: string;
  /** Requested output resolution, for example `1080p`, `2K`, or `4K`. */
  resolution?: string;
  /** Optional deterministic seed. */
  seed?: string;
}
