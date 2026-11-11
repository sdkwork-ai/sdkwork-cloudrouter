import type { ProviderJsonValue } from './provider-json-value';

/** Alibaba DashScope Wan video generation request (`POST /api/v1/services/aigc/video-generation/video-synthesis`). */
export interface AlibabaVideoGenerationRequest {
  /** DashScope input envelope. `prompt` is required for text-to-video and `img_url` is required for image-to-video; reference-to-video models use `reference_urls`. */
  input: { audio_url?: string; img_url?: string; negative_prompt?: string; prompt?: string; template?: string; } & Record<string, ProviderJsonValue>;
  /** Wan video model id, for example wan2.7-t2v-2026-06-12, wan2.6-i2v, or wan2.6-r2v. */
  model: string;
  /** DashScope video processing parameters. */
  parameters?: { duration?: number; prompt_extend?: boolean; ratio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4'; resolution?: '480P' | '720P' | '1080P'; seed?: number; watermark?: boolean; } & Record<string, ProviderJsonValue>;
}
