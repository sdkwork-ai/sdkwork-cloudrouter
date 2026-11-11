import type { ProviderJsonValue } from './provider-json-value';

/** Vidu scene-template request (`POST /ent/v2/template`). */
export interface ViduTemplateRequest {
  /** Region option for the `exotic_princess` template. */
  area?: string;
  /** Requested aspect ratio; supported values depend on the template. */
  aspect_ratio?: string;
  /** Beast option for the `beast_companion` template. */
  beast?: string;
  /** Whether Vidu adds generated background music. */
  bgm?: boolean;
  /** Optional callback URL. */
  callback_url?: string;
  /** Input image URLs or Base64 data URLs. */
  images: string[];
  /** JSON metadata string forwarded to Vidu. */
  meta_data?: string;
  /** Off-peak generation at a lower price. */
  off_peak?: boolean;
  /** Opaque payload forwarded to Vidu. */
  payload?: string;
  /** Text prompt; required for some templates such as `subject_3`. */
  prompt?: string;
  /** Optional deterministic seed. */
  seed?: string;
  /** Template id such as `hugging`; each template accepts its own extra parameters. */
  template: string;
  /** Motion reference video URLs for motion-control templates such as `motion_control_2`. */
  video_urls?: string[];
  /** Whether the output carries the Vidu watermark. */
  watermark?: boolean;
  /** Watermark position. */
  wm_position?: number;
  /** Custom watermark image URL. */
  wm_url?: string;
}
