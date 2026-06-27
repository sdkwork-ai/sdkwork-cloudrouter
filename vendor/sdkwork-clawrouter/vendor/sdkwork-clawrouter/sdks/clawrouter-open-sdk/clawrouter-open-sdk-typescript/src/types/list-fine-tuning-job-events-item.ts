import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listFineTuningJobEvents list response. */
export interface ListFineTuningJobEventsItem {
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Fine-tuned model id when available. */
  fine_tuned_model?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Base or fine-tuned model id. */
  model?: string;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Result file identifiers returned by the fine-tuning job. */
  result_files?: string[];
  /** Current resource status when returned by the selected upstream. */
  status?: string;
  /** Training file identifier. */
  training_file?: string;
}
