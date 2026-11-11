import type { ProviderJsonValue } from './provider-json-value';

/** One Luma keyframe: an image URL (`type=image`) or another generation id (`type=generation`). */
export interface LumaKeyframe {
  /** Generation id when `type` is `generation`. */
  id?: string;
  /** Keyframe reference type. */
  type: 'image' | 'generation';
  /** Image URL when `type` is `image`. */
  url?: string;
}
