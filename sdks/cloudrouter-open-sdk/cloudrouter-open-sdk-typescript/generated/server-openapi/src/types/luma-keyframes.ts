import type { LumaKeyframe } from './luma-keyframe';
import type { ProviderJsonValue } from './provider-json-value';

/** Luma first and last keyframes. */
export interface LumaKeyframes {
  /** First frame. */
  frame0?: LumaKeyframe;
  /** Last frame. */
  frame1?: LumaKeyframe;
}
