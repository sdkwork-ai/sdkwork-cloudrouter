import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible eval run output item. */
export interface OpenAiEvalRunOutputItem {
  /** Unix timestamp in seconds when the output item was created. */
  created_at?: string;
  /** Eval identifier associated with the output item. */
  eval_id?: string;
  /** Eval run output item identifier. */
  id: string;
  /** Developer-defined output item metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally eval.run.output_item. */
  object: 'eval.run.output_item';
  /** Testing criteria results for this output item. */
  results?: ProviderJsonValue[];
  /** Eval run identifier associated with the output item. */
  run_id?: string;
  /** Input sample evaluated by this output item. */
  sample?: ProviderJsonValue;
  /** Output item status. */
  status?: string;
}
