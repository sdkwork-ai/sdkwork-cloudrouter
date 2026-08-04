import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic thinking config schema exposed by Cloud Router vendor routing. */
export interface AnthropicThinkingConfig {
  /** Thinking token budget. */
  budget_tokens?: number;
  /** Thinking mode. */
  type: string;
}
