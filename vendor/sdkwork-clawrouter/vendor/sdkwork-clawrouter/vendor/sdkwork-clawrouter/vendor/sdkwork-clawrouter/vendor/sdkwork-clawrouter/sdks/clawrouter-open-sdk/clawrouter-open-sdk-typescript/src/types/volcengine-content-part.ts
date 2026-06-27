import type { ProviderJsonValue } from './provider-json-value';

/** Volcengine Ark volcengine content part schema exposed by Claw Router vendor routing. */
export interface VolcengineContentPart {
  /** Provider file identifier. */
  file_id?: string;
  /** Input image URL. */
  image_url?: string;
  /** Text prompt content. */
  text?: string;
  /** Content part type. */
  type: string;
  /** Input video URL. */
  video_url?: string;
}
