import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update an eval. */
export interface OpenAiEvalUpdateRequest {
  /** Data source used by the eval or eval run. */
  data_source?: ProviderJsonValue;
  /** Data source configuration used by the eval. */
  data_source_config?: ProviderJsonValue;
  /** Developer-defined eval metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable eval name. */
  name?: string;
  /** Testing criteria used by the eval. */
  testing_criteria?: ProviderJsonValue[];
}
