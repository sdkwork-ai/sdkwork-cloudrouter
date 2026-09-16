import type { ProviderJsonValue } from './provider-json-value';

/** Vidu vidu template request schema exposed by Cloud Router vendor routing. */
export interface ViduTemplateRequest {
  /** Optional callback URL. */
  callback_url?: string;
  /** Character image URLs (single front-facing person). */
  images: string[];
  /** Opaque request parameter echoed back by task queries. */
  payload?: string;
  /** Template id, for example motion_control_2 or motion_control_2.5. */
  template: string;
  /** Motion reference video URLs (single front-facing person, 3-30 seconds). */
  video_urls: string[];
}
