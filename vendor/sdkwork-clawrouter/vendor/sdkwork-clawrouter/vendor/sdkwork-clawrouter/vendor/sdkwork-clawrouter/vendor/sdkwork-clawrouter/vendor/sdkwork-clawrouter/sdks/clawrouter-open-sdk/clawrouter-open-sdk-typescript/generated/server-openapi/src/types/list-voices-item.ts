import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listVoices list response. */
export interface ListVoicesItem {
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
  /** Transcript or translated text when returned by the upstream. */
  text?: string;
  /** Audio URL when returned by the upstream. */
  url?: string;
  /** Voice identifier used by the upstream. */
  voice?: string;
}
