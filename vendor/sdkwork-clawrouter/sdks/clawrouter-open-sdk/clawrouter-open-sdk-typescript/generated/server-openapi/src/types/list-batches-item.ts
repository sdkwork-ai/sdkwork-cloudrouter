import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listBatches list response. */
export interface ListBatchesItem {
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Endpoint processed by the batch. */
  endpoint?: string;
  /** Error file identifier produced by the batch. */
  error_file_id?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Input file identifier processed by the batch. */
  input_file_id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Output file identifier produced by the batch. */
  output_file_id?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
}
