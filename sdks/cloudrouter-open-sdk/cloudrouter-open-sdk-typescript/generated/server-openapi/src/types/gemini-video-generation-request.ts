import type { ProviderJsonValue } from './provider-json-value';

/** Gemini video generation request schema exposed by Cloud Router. */
export interface GeminiVideoGenerationRequest {
  /** Generation instances. */
  instances: ({ image?: Record<string, ProviderJsonValue>; prompt: string; } & Record<string, ProviderJsonValue>)[];
  /** Generation tuning parameters. */
  parameters?: { aspectRatio?: string; durationSeconds?: number; personGeneration?: string; } & Record<string, ProviderJsonValue>;
}
