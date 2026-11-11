import type { ProviderJsonValue } from './provider-json-value';

/** Runway text-to-video task request (union of the vendor's per-model request variants). */
export interface RunwayTextToVideoRequest {
  /** Whether the output includes generated audio. */
  audio?: boolean;
  /** Output bitrate tier. */
  bitrate?: 'standard' | 'high';
  /** Classifier-free guidance scale. */
  cfgScale?: number;
  /** Content-moderation settings, for example `publicFigureThreshold`. */
  contentModeration?: Record<string, ProviderJsonValue>;
  /** Generate a cheaper draft. */
  draft?: boolean;
  /** Draft task to refine when generating the final video. */
  draftTaskId?: string;
  /** Requested duration in seconds; accepted bounds depend on the selected model. */
  duration?: number;
  /** Runway video model id, for example gen4.5, veo3.1, or kling3.0_pro. */
  model: string;
  /** Content the model should avoid. */
  negativePrompt?: string;
  /** Output container and encoding. */
  outputFormat?: 'mp4' | 'mov' | 'prores' | 'png_sequence' | 'hdr10' | 'hlg' | 'sdr_rec709_10bit' | 'hdr_pq_12bit_master' | 'hdr_prores' | 'hdr_png_sequence' | 'hdr_exr_sequence' | 'hdr_exr_acescg_sequence_1_3' | 'hdr_exr_acescg_sequence_2_0';
  /** Prompt expansion mode. */
  promptExpansionMode?: 'disabled' | 'balanced' | 'quality';
  /** Text prompt describing the requested video. */
  promptText: string;
  /** ProRes profile when `outputFormat` is a ProRes variant. */
  proresProfile?: '422' | '422 Proxy' | '422 LT' | '422 HQ' | '4444' | '4444 XQ';
  /** Model-provider-specific settings. */
  providerSettings?: Record<string, ProviderJsonValue>;
  /** Requested aspect ratio such as 1280:720. */
  ratio?: string;
  /** Reference audio clips. */
  referenceAudio?: Record<string, ProviderJsonValue>[];
  /** Reference videos. */
  referenceVideos?: Record<string, ProviderJsonValue>[];
  /** Reference images or videos. */
  references?: Record<string, ProviderJsonValue>[];
  /** Output resolution tier. */
  resolution?: '480p' | '720p' | '768p' | '1080p' | '2k' | '720P' | '768P' | '1080P' | '2K';
  /** Optional deterministic seed. */
  seed?: number;
}
