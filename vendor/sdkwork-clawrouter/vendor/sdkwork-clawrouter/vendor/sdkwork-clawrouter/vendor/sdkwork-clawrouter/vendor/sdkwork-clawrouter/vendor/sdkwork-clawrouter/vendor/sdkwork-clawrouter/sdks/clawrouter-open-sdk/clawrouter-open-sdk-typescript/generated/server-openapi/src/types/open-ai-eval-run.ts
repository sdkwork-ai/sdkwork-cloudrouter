import type { OpenAiEvalRunResultCounts } from './open-ai-eval-run-result-counts';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible eval run object. */
export interface OpenAiEvalRun {
  /** Unix timestamp in seconds when the eval run was created. */
  created_at: string;
  /** Data source used by this eval run. */
  data_source?: ProviderJsonValue;
  /** Eval identifier that owns this run. */
  eval_id?: string;
  /** Eval run identifier. */
  id: string;
  /** Developer-defined eval run metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable eval run name. */
  name?: string;
  /** Object type, normally eval.run. */
  object: 'eval.run';
  /** Eval run report URL when returned. */
  report_url?: string;
  /** Result counts field on the open ai eval run, using the open ai eval run result counts module. */
  result_counts?: OpenAiEvalRunResultCounts;
  /** Eval run lifecycle status. */
  status: string;
}
