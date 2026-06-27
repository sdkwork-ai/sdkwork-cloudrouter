import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat image url schema exposed by Claw Router. */
export interface OpenAiChatImageUrl {
  /** Image detail preference, such as low, high, or auto. */
  detail?: string;
  /** Image URL or data URL. */
  url: string;
}
