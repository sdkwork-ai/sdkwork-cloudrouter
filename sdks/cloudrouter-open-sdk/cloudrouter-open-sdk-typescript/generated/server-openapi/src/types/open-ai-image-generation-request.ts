import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible image generation request (`POST /v1/images/generations`). */
export interface OpenAiImageGenerationRequest {
  /** Output background. */
  background?: 'transparent' | 'opaque' | 'auto';
  /** Planning compute independently of rendering quality. */
  complexity?: 'low' | 'medium' | 'high';
  /** Number of frames for GIF output; only with `output_format=gif`. */
  frame_count?: number;
  /** Delay per GIF frame in milliseconds. */
  frame_duration_ms?: number;
  /** Image model id such as gpt-image-2 or dall-e-3, or a Cloud Router catalog key. */
  model: string;
  /** Content-moderation level. */
  moderation?: 'low' | 'auto';
  /** Number of images to generate in [1, 10]. */
  n?: number;
  /** Compression level for `webp` or `jpeg` output. */
  output_compression?: number;
  /** Returned image format. */
  output_format?: 'png' | 'webp' | 'jpeg' | 'gif' | 'svg';
  /** Number of partial images emitted while streaming. */
  partial_images?: number;
  /** Text prompt describing the image to generate; at most 32000 characters. */
  prompt: string;
  /** Output quality; `standard`/`hd` are legacy DALL-E values. */
  quality?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'auto' | 'standard' | 'hd';
  /** Legacy response format for retired image models. */
  response_format?: 'url' | 'b64_json';
  /** Stable end-user identifier for safety monitoring. */
  safety_identifier?: string;
  /** Requested image size, for example `auto`, `1024x1024`, or `1536x1024`; custom `WIDTHxHEIGHT` is supported by newer models. */
  size?: string;
  /** Stream partial image results as events. */
  stream?: boolean;
  /** Legacy style for retired image models. */
  style?: 'vivid' | 'natural';
  /** SVG authoring selection; requires `output_format=svg`. */
  svg?: Record<string, ProviderJsonValue>;
  /** Deprecated end-user identifier; use `safety_identifier`. */
  user?: string;
}
