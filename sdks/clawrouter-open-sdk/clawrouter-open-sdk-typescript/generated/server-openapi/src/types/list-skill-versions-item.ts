import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listSkillVersions list response. */
export interface ListSkillVersionsItem {
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Human-readable skill description. */
  description?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable skill name. */
  name?: string;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
  /** Skill version identifier. */
  version?: string;
}
