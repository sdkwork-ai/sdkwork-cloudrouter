import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listFiles list response. */
export interface ListFilesItem {
  /** File size in bytes. */
  bytes?: string;
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Uploaded or returned file name. */
  filename?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** OpenAI-compatible object type. */
  object?: string;
  /** OpenAI-compatible file purpose. */
  purpose?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
}
