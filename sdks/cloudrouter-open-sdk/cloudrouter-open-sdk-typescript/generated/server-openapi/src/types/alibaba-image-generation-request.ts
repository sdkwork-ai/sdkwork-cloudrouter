import type { ProviderJsonValue } from './provider-json-value';

/** Alibaba DashScope Wanx image generation request (`POST /api/v1/services/aigc/text2image/image-synthesis`). */
export interface AlibabaImageGenerationRequest {
  /** DashScope input envelope. */
  input: { negative_prompt?: string; prompt: string; } & Record<string, ProviderJsonValue>;
  /** Wanx image model id, for example wan2.5-t2i-preview or wan2.2-t2i-flash. */
  model: string;
  /** DashScope image processing parameters. */
  parameters?: { n?: number; prompt_extend?: boolean; seed?: number; size?: string; watermark?: boolean; } & Record<string, ProviderJsonValue>;
}
