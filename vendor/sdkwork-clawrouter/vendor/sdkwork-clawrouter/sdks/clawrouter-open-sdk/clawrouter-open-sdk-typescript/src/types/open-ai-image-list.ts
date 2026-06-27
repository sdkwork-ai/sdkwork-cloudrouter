import type { OpenAiImage } from './open-ai-image';
import type { OpenAiTokenUsage } from './open-ai-token-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible image generation response. */
export interface OpenAiImageList {
  /** Unix timestamp in seconds when the image output was created. */
  created: string;
  /** Generated, edited, or varied image outputs. */
  data: OpenAiImage[];
  /** Usage field on the open ai image list, using the open ai token usage module. */
  usage?: OpenAiTokenUsage;
}
