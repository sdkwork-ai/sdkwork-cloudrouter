import type { ProviderJsonValue } from './provider-json-value';

/** Counts of eval run output item results. */
export interface OpenAiEvalRunResultCounts {
  /** Number of errored output items. */
  errored?: number;
  /** Number of failed output items. */
  failed?: number;
  /** Number of passed output items. */
  passed?: number;
  /** Total number of output items. */
  total?: number;
}
