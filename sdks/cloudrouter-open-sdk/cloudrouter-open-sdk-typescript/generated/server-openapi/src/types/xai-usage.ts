import type { ProviderJsonValue } from './provider-json-value';

/** xAI usage block. cost_in_usd_ticks is the authoritative charge: divide by 10,000,000 for USD. */
export interface XaiUsage {
  /** Total completion tokens used. */
  completion_tokens?: number;
  /** Accurate cost of this request in USD ticks. */
  cost_in_usd_ticks: number;
  /** Number of live-search sources used. */
  num_sources_used?: number;
  /** Total prompt tokens used. */
  prompt_tokens?: number;
  /** Prompt plus completion tokens. */
  total_tokens?: number;
}
