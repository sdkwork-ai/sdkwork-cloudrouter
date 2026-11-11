import type { ProviderJsonValue } from './provider-json-value';

/** Gemini image generation request schema exposed by Cloud Router. */
export interface GeminiImageGenerationRequest {
  /** Generation instances. */
  instances: ({ image?: Record<string, ProviderJsonValue>; prompt: string; } & Record<string, ProviderJsonValue>)[];
  /** Generation tuning parameters. */
  parameters?: { aspectRatio?: string; personGeneration?: string; sampleCount?: number; } & Record<string, ProviderJsonValue>;
}
