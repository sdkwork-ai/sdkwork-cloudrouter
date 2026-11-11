import type { LumaConcept } from './luma-concept';
import type { LumaKeyframes } from './luma-keyframes';
import type { ProviderJsonValue } from './provider-json-value';

/** Luma Dream Machine video generation request (`POST /dream-machine/v1/generations/video`). */
export interface LumaVideoGenerationRequest {
  /** Output aspect ratio. */
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '9:21';
  /** Callback URL notified when the generation starts, completes, or fails. */
  callback_url?: string;
  /** Concept references. */
  concepts?: LumaConcept[];
  /** Output duration: `5s`, `9s`, or a model-specific value. */
  duration?: string;
  /** Generation type. */
  generation_type?: 'video';
  /** First and last keyframes for image-to-video or extension. */
  keyframes?: LumaKeyframes;
  /** Whether the generated video loops seamlessly. */
  loop?: boolean;
  /** Luma video model. */
  model: 'ray-2' | 'ray-flash-2';
  /** Text prompt describing the requested video. */
  prompt?: string;
  /** Output resolution: `540p`, `720p`, `1080p`, `4k`, or a model-specific value. */
  resolution?: string;
}
