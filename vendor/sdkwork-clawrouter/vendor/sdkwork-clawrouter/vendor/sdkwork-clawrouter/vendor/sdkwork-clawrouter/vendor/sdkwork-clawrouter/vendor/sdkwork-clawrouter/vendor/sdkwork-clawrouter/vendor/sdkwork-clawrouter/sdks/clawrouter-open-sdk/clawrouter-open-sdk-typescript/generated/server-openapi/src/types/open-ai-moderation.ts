import type { OpenAiModerationResult } from './open-ai-moderation-result';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible moderation response. */
export interface OpenAiModeration {
  /** Moderation response identifier. */
  id: string;
  /** Moderation model used by the upstream. */
  model: string;
  /** Moderation classification results. */
  results: OpenAiModerationResult[];
}
