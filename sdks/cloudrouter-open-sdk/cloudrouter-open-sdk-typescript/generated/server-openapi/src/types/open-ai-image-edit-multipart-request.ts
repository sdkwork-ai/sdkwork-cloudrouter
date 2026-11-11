import type { OpenAiBinaryFilePart } from './open-ai-binary-file-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible image edit request (multipart form). */
export interface OpenAiImageEditMultipartRequest {
  /** Output background. */
  background?: 'transparent' | 'opaque' | 'auto';
  /** Planning compute independently of rendering quality. */
  complexity?: 'low' | 'medium' | 'high';
  /** Number of frames for GIF output. */
  frame_count?: number;
  /** Delay per GIF frame in milliseconds. */
  frame_duration_ms?: number;
  /** Image field on the open ai image edit multipart request, using the open ai binary file part module. */
  image: OpenAiBinaryFilePart;
  /** Input style and facial-feature fidelity. */
  input_fidelity?: 'high' | 'low';
  /** Markup image reference. */
  markup?: string;
  /** Mask field on the open ai image edit multipart request, using the open ai binary file part module. */
  mask?: OpenAiBinaryFilePart;
  /** Image edit model id. */
  model: string;
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
  /** Legacy response format. */
  response_format?: 'url' | 'b64_json';
  /** Stable end-user identifier for safety monitoring. */
  safety_identifier?: string;
  /** Requested output size. */
  size?: string;
  /** Stream partial image results as events. */
  stream?: boolean;
  /** SVG authoring selection; requires `output_format=svg`. */
  svg?: Record<string, ProviderJsonValue>;
  /** Deprecated end-user identifier. */
  user?: string;
}
