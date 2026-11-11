import type { AnthropicOutputFormat } from './anthropic-output-format';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic output configuration. */
export interface AnthropicOutputConfig {
  /** Reasoning effort level. */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Structured output format. */
  format?: AnthropicOutputFormat;
}
