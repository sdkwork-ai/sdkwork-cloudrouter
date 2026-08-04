import type { OpenAiChatContentPart } from './open-ai-chat-content-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai prediction config schema exposed by Cloud Router. */
export interface OpenAiPredictionConfig {
  /** Static predicted content. */
  content?: string | OpenAiChatContentPart[];
  /** Prediction configuration type. */
  type: string;
}
