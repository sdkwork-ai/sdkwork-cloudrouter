import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible eval object. */
export interface OpenAiEval {
  /** Unix timestamp in seconds when the eval was created. */
  created_at: string;
  /** Data source configuration used by the eval. */
  data_source_config?: ProviderJsonValue;
  /** Eval identifier. */
  id: string;
  /** Developer-defined eval metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable eval name. */
  name?: string;
  /** Object type, normally eval. */
  object: 'eval';
  /** Testing criteria used by the eval. */
  testing_criteria?: ProviderJsonValue[];
}
