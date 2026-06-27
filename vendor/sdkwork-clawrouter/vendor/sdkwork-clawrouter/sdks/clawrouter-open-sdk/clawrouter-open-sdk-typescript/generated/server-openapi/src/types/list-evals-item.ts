import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listEvals list response. */
export interface ListEvalsItem {
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Eval data source returned by the upstream. */
  data_source?: ProviderJsonValue;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable eval or eval run name. */
  name?: string;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Eval run result counters when available. */
  result_counts?: ProviderJsonValue;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
}
