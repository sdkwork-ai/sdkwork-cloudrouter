import type { ProviderJsonValue } from './provider-json-value';

/** Runway text-to-image task request (union of the vendor's per-model request variants). */
export interface RunwayTextToImageRequest {
  /** Output background. */
  background?: 'transparent' | 'opaque' | 'auto';
  /** Background color when the background is opaque. */
  backgroundColor?: string;
  /** Palette colors requested by the caller. */
  colors?: string[];
  /** Content-moderation settings, for example `publicFigureThreshold`. */
  contentModeration?: Record<string, ProviderJsonValue>;
  /** Run the model in edit mode. */
  edit?: boolean;
  /** Enable grounding for the generation. */
  grounding?: boolean;
  /** Mask image URI for edit mode. */
  maskUri?: string;
  /** Runway image model id, for example gen4_image. */
  model?: string;
  /** Number of images to generate. */
  outputCount?: number;
  /** Output image format. */
  outputFormat?: 'webp' | 'png' | 'jpeg';
  /** Use precise editing. */
  preciseEdit?: boolean;
  /** Text prompt describing the requested image. */
  promptText: string;
  /** Generation quality tier. */
  quality?: 'low' | 'medium' | 'high' | 'auto';
  /** Requested aspect ratio such as 1920:1080. */
  ratio?: string;
  /** Reference images carrying a uri and an optional tag. */
  referenceImages?: Record<string, ProviderJsonValue>[];
  /** Optional deterministic seed. */
  seed?: number;
  /** Reasoning effort for image models that support it. */
  thinkingLevel?: 'minimal' | 'medium' | 'high';
}
