import type { ProviderJsonValue } from './provider-json-value';

/** Black Forest Labs FLUX 3 video generation request (`POST /v1/flux-3-video`). The vendor body is a discriminated union on `mode`: `t2v` requires `prompt`, `i2v` requires `prompt` and `keyframes`, `v2v` requires `prompt` and `start_video`, and `draft_enhance` requires `draft_cache`. */
export interface BlackForestLabsVideoGenerationRequest {
  /** Output aspect ratio, or `auto` to let the harness choose from the prompt. */
  aspect_ratio?: '21:9' | '2:1' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '9:21' | 'auto';
  /** Generate a fast preview and return a `draft_cache` bundle. */
  draft?: boolean;
  /** Encrypted draft-cache bundle from a prior `draft` generation (`draft_enhance`). */
  draft_cache?: string;
  /** Video duration in whole seconds (5-20), or `auto` to fit the content. */
  duration?: number;
  /** Generate synchronized audio alongside the video. */
  generate_audio?: boolean;
  /** Images used as video frames for `i2v`; a single URL/base64 image, an array, or `[timestamp, image]` keyframe pairs. */
  keyframes?: string | string[];
  /** Generation mode; selects which other fields are required. */
  mode: 't2v' | 'i2v' | 'v2v' | 'draft_enhance';
  /** Free-form prompt describing the video. */
  prompt?: string;
  /** Video resolution class. */
  resolution?: 'hd' | 'fhd' | 'qhd' | 'uhd';
  /** Harm-moderation tolerance from 0 (strictest) to 7. */
  safety_tolerance?: number;
  /** Video to continue for `v2v`; an http(s) URL or base64 mp4. */
  start_video?: string;
  /** Opaque end-user identifier supplied by the calling platform. */
  user?: string;
  /** Endpoint version; `latest` (default) or a dated release. */
  version?: string;
}
