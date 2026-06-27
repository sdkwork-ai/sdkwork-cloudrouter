import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listContainers list response. */
export interface ListContainersItem {
  /** Container file size in bytes. */
  bytes?: string;
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Container file name. */
  filename?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable container name. */
  name?: string;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
}
