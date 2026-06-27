import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai reasoning config schema exposed by Claw Router. */
export interface OpenAiReasoningConfig {
  /** Reasoning effort hint. */
  effort?: 'minimal' | 'low' | 'medium' | 'high';
  /** Reasoning summary behavior when supported. */
  summary?: 'auto' | 'concise' | 'detailed';
}
