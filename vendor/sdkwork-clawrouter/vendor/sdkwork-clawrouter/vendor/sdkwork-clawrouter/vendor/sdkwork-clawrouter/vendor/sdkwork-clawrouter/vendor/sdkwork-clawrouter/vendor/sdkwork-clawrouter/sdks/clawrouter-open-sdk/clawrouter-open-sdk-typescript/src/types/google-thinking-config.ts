import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google thinking config schema exposed by Claw Router vendor routing. */
export interface GoogleThinkingConfig {
  /** Whether thought summaries should be included when supported. */
  includeThoughts?: boolean;
  /** Requested thinking token budget. */
  thinkingBudget?: number;
}
