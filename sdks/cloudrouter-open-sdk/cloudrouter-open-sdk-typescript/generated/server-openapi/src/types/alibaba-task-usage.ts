import type { ProviderJsonValue } from './provider-json-value';

/** DashScope task usage counters. */
export interface AlibabaTaskUsage {
  /** Output resolution tier, for example 720. */
  SR?: number;
  /** Total billed video seconds. */
  duration?: number;
  /** Number of successfully generated images. */
  image_count?: number;
  /** Input video seconds; fixed to 0 for text-to-video and image-to-video. */
  input_video_duration?: number;
  /** Generated video seconds. */
  output_video_duration?: number;
  /** Output aspect ratio. */
  ratio?: string;
}
