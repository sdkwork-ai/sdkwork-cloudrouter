import type { ProviderJsonValue } from './provider-json-value';

/** Vidu template video request schema (motion sync templates such as motion_control_2) exposed by Cloud Router vendor routing. */
export interface ViduTemplateRequest {
  /** Template id, for example motion_control_2 or motion_control_2.5. */
  template: string;
  /** Character image URLs (single front-facing person). */
  images: string[];
  /** Motion reference video URLs (single front-facing person, 3-30 seconds). */
  video_urls: string[];
  /** Opaque passthrough parameter echoed by task queries. */
  payload?: string;
  /** Optional callback URL. */
  callback_url?: string;
}
