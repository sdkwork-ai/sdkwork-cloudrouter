import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic thinking config schema exposed by Cloud Router vendor routing. */
export interface AnthropicThinkingConfig {
  /** Thinking token budget; must be at least 1024 and less than `max_tokens`. */
  budget_tokens?: number;
  /** How thinking content appears in the response when the mode is `adaptive`. */
  display?: 'summarized' | 'omitted';
  /** Thinking mode. */
  type: 'enabled' | 'disabled' | 'between_tools' | 'adaptive';
}
