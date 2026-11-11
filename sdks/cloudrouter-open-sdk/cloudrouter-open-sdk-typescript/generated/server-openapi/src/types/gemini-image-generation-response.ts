import type { ProviderJsonValue } from './provider-json-value';

/** Gemini image generation response schema exposed by Cloud Router. */
export interface GeminiImageGenerationResponse {
  /** Vendor error envelope. */
  error?: { code?: number; message?: string; } & Record<string, ProviderJsonValue>;
  /** Generated image predictions. */
  predictions?: ({ bytesBase64Encoded?: string; gcsUri?: string; mimeType?: string; uri?: string; } & Record<string, ProviderJsonValue>)[];
}
