import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create an eval run. */
export interface OpenAiEvalRunCreateRequest {
  /** Data source used by this eval run. */
  data_source?: ProviderJsonValue;
  /** Developer-defined eval run metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable eval run name. */
  name?: string;
}
