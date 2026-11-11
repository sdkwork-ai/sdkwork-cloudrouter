import type { OpenAiImageReferenceInput } from './open-ai-image-reference-input';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible image edit request (JSON form, `POST /v1/images/edits`). */
export interface OpenAiImageEditRequest {
  /** Output background. */
  background?: 'transparent' | 'opaque' | 'auto';
  /** Planning compute independently of rendering quality. */
  complexity?: 'low' | 'medium' | 'high';
  /** Number of frames for GIF output. */
  frame_count?: number;
  /** Delay per GIF frame in milliseconds. */
  frame_duration_ms?: number;
  /** Input image references to edit; up to 16. */
  images: OpenAiImageReferenceInput[];
  /** How closely the model matches input style and facial features. */
  input_fidelity?: 'high' | 'low';
  /** Markup reference: exactly one of `image_url` or `file_id`. */
  markup?: Record<string, ProviderJsonValue>;
  /** Mask reference: exactly one of `image_url` or `file_id`. */
  mask?: Record<string, ProviderJsonValue>;
  /** Image edit model id or Cloud Router catalog key. */
  model?: string;
  /** Content-moderation level. */
  moderation?: 'low' | 'auto';
  /** Number of edited images to generate. */
  n?: number;
  /** Compression level for `jpeg` or `webp`. */
  output_compression?: number;
  /** Returned image format. */
  output_format?: 'png' | 'webp' | 'jpeg' | 'gif' | 'svg';
  /** Number of partial images emitted while streaming. */
  partial_images?: number;
  /** Text prompt describing the edit. */
  prompt: string;
  /** Output quality. */
  quality?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'auto';
  /** Stable end-user identifier for safety monitoring. */
  safety_identifier?: string;
  /** Requested output size, including custom `WIDTHxHEIGHT` for newer models. */
  size?: string;
  /** Stream partial image results as events. */
  stream?: boolean;
  /** SVG authoring selection; requires `output_format=svg`. */
  svg?: Record<string, ProviderJsonValue>;
  /** Deprecated end-user identifier; use `safety_identifier`. */
  user?: string;
}
