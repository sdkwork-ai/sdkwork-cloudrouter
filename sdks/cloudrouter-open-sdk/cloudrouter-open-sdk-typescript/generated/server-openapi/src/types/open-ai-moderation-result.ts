import type { ProviderJsonValue } from './provider-json-value';

/** Single OpenAI-compatible moderation classification result. */
export interface OpenAiModerationResult {
  /** Boolean category flags returned by the moderation model. */
  categories?: Record<string, ProviderJsonValue>;
  /** Moderation category scores keyed by category name. */
  category_scores?: Record<string, number>;
  /** Whether the input was flagged by moderation. */
  flagged?: boolean;
}
