import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listVectorStoreFiles list response. */
export interface ListVectorStoreFilesItem {
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Vector store file identifier. */
  file_id?: string;
  /** File identifiers attached to the vector store or batch. */
  file_ids?: string[];
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable vector store name. */
  name?: string;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
  /** Vector store storage usage in bytes. */
  usage_bytes?: string;
}
