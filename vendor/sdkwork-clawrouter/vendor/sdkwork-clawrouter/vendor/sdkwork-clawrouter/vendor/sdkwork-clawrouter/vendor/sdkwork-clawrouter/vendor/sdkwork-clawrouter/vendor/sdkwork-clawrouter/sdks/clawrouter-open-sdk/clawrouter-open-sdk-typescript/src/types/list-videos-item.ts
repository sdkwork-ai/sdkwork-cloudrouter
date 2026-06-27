import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listVideos list response. */
export interface ListVideosItem {
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Video model used by the upstream. */
  model?: string;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
  /** Generated video URL when returned by the upstream. */
  url?: string;
  /** Generated video payload or provider-specific video record. */
  video?: ProviderJsonValue;
}
