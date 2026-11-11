import type { ProviderJsonValue } from './provider-json-value';

/** Gemini video operation schema exposed by Cloud Router. */
export interface GeminiVideoOperation {
  /** Whether the operation finished. */
  done?: boolean;
  /** Vendor error envelope. */
  error?: { code?: number; message?: string; } & Record<string, ProviderJsonValue>;
  /** Long-running operation resource name, for example models/veo-3.1-generate-preview/operations/op-1. */
  name?: string;
  /** Finished operation response. */
  response?: { generateVideoResponse?: { generatedSamples?: ({ gcsUri?: string; uri?: string; url?: string; video?: { uri?: string; url?: string; } & Record<string, ProviderJsonValue>; } & Record<string, ProviderJsonValue>)[]; raiMediaFilteredReasons?: string[]; videos?: Record<string, ProviderJsonValue>[]; } & Record<string, ProviderJsonValue>; } & Record<string, ProviderJsonValue>;
}
